import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os
from typing import List, Dict, Tuple, Any
from .models import Pokemon, SavedTeam, User, TypeEfficacy
from .database import SessionLocal
import logging

logger = logging.getLogger(__name__)

class TeamRecommender:
    def __init__(self, model_path: str = "team_recommender_model.pkl"):
        self.model_path = model_path
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_columns = []
        self.is_trained = False

        # Load existing model if available
        self._load_model()

    def _extract_team_features(self, team_pokemon: List[Pokemon], efficacy_map: Dict[str, Dict[str, float]]) -> Dict[str, float]:
        """Extract features from a team for ML model"""
        if not team_pokemon:
            return {}

        # Basic stats
        total_hp = sum(p.hp or 0 for p in team_pokemon)
        total_attack = sum(p.attack or 0 for p in team_pokemon)
        total_defense = sum(p.defense or 0 for p in team_pokemon)
        total_sp_atk = sum(p.special_attack or 0 for p in team_pokemon)
        total_sp_def = sum(p.special_defense or 0 for p in team_pokemon)
        total_speed = sum(p.speed or 0 for p in team_pokemon)

        avg_stats = {
            'avg_hp': total_hp / len(team_pokemon),
            'avg_attack': total_attack / len(team_pokemon),
            'avg_defense': total_defense / len(team_pokemon),
            'avg_sp_atk': total_sp_atk / len(team_pokemon),
            'avg_sp_def': total_sp_def / len(team_pokemon),
            'avg_speed': total_speed / len(team_pokemon),
            'total_bst': total_hp + total_attack + total_defense + total_sp_atk + total_sp_def + total_speed
        }

        # Type coverage features
        from .utils import ALL_TYPES, calculate_type_coverage
        coverage = calculate_type_coverage(team_pokemon, efficacy_map)

        # Count weaknesses/resistances/immunities
        weaknesses = sum(1 for score in coverage.values() if score > 0)
        resistances = sum(1 for score in coverage.values() if score < 0)
        immunities = sum(1 for score in coverage.values() if score <= -2.0)

        # Team diversity
        type1_counts = {}
        type2_counts = {}
        for p in team_pokemon:
            type1_counts[p.type1] = type1_counts.get(p.type1, 0) + 1
            if p.type2:
                type2_counts[p.type2] = type2_counts.get(p.type2, 0) + 1

        type_diversity = len(set(list(type1_counts.keys()) + list(type2_counts.keys())))

        # Legendary/Mythical count
        legendary_count = sum(1 for p in team_pokemon if p.is_legendary or p.is_mythical)

        # Generation spread
        generations = [p.generation for p in team_pokemon if p.generation]
        gen_spread = max(generations) - min(generations) if generations else 0

        features = {
            **avg_stats,
            'weaknesses': weaknesses,
            'resistances': resistances,
            'immunities': immunities,
            'type_diversity': type_diversity,
            'legendary_count': legendary_count,
            'gen_spread': gen_spread,
            'team_size': len(team_pokemon)
        }

        # Add individual type coverage scores
        for ptype in ALL_TYPES:
            features[f'coverage_{ptype}'] = coverage.get(ptype, 0.0)

        return features

    def _prepare_training_data(self) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Prepare training data from existing teams in database"""
        db = SessionLocal()
        try:
            # Get all public teams (assuming they're good/competitive)
            teams = db.query(SavedTeam).filter(SavedTeam.is_public == True).all()

            if len(teams) < 5:
                logger.warning("Not enough public teams for training. Need at least 5.")
                return np.array([]), np.array([]), []

            # Get all pokemon and type efficacy
            all_pokemon = db.query(Pokemon).all()
            efficacies = db.query(TypeEfficacy).all()

            # Build efficacy map
            efficacy_map = {}
            for e in efficacies:
                if e.damage_type not in efficacy_map:
                    efficacy_map[e.damage_type] = {}
                efficacy_map[e.damage_type][e.target_type] = e.damage_factor

            # Prepare features and labels
            features_list = []
            labels_list = []

            for team in teams:
                try:
                    # Get team pokemon
                    pokemon_ids = []
                    import json
                    if team.team_data:
                        pokemon_ids = json.loads(team.team_data)

                    if not pokemon_ids or len(pokemon_ids) == 0:
                        continue

                    team_pokemon = db.query(Pokemon).filter(Pokemon.id.in_(pokemon_ids)).all()

                    if len(team_pokemon) == 0:
                        continue

                    # Extract features
                    team_features = self._extract_team_features(team_pokemon, efficacy_map)

                    # For now, we'll use a simple heuristic as label:
                    # Teams with good balance (not too many weaknesses) get label 1
                    weaknesses = team_features.get('weaknesses', 0)
                    label = 1 if weaknesses <= 2 else 0  # Good team if <= 2 major weaknesses

                    # Convert features to array
                    feature_vector = [team_features.get(col, 0) for col in self._get_feature_columns()]

                    features_list.append(feature_vector)
                    labels_list.append(label)

                except Exception as e:
                    logger.error(f"Error processing team {team.id}: {e}")
                    continue

            if len(features_list) == 0:
                logger.warning("No valid training data found")
                return np.array([]), np.array([]), []

            X = np.array(features_list)
            y = np.array(labels_list)

            # Get feature names (excluding coverage columns for simplicity)
            base_features = ['avg_hp', 'avg_attack', 'avg_defense', 'avg_sp_atk',
                           'avg_sp_def', 'avg_speed', 'total_bst', 'weaknesses',
                           'resistances', 'immunities', 'type_diversity',
                           'legendary_count', 'gen_spread', 'team_size']

            # Add coverage features
            coverage_features = [f'coverage_{ptype}' for ptype in ALL_TYPES]
            feature_names = base_features + coverage_features

            return X, y, feature_names

        finally:
            db.close()

    def _get_feature_columns(self) -> List[str]:
        """Get the list of feature columns used by the model"""
        if not self.feature_columns:
            base_features = ['avg_hp', 'avg_attack', 'avg_defense', 'avg_sp_atk',
                           'avg_sp_def', 'avg_speed', 'total_bst', 'weaknesses',
                           'resistances', 'immunities', 'type_diversity',
                           'legendary_count', 'gen_spread', 'team_size']
            from .utils import ALL_TYPES
            coverage_features = [f'coverage_{ptype}' for ptype in ALL_TYPES]
            self.feature_columns = base_features + coverage_features
        return self.feature_columns

    def train(self) -> Dict[str, Any]:
        """Train the recommendation model"""
        logger.info("Starting ML model training...")

        X, y, feature_names = self._prepare_training_data()

        if len(X) == 0 or len(y) == 0:
            logger.error("No training data available")
            return {"success": False, "error": "No training data available"}

        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train model
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )

        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)

        # Feature importance
        feature_importance = dict(zip(self._get_feature_columns(),
                                    self.model.feature_importances_))

        self.is_trained = True

        # Save model
        self._save_model()

        logger.info(f"Model trained successfully. Accuracy: {accuracy:.3f}")

        return {
            "success": True,
            "accuracy": float(accuracy),
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "feature_importance": feature_importance
        }

    def predict_team_quality(self, team_pokemon: List[Pokemon]) -> float:
        """Predict the quality/score of a team (0-1)"""
        if not self.is_trained or self.model is None:
            logger.warning("Model not trained, returning default score")
            return 0.5

        if not team_pokemon:
            return 0.0

        db = SessionLocal()
        try:
            efficacies = db.query(TypeEfficacy).all()
            efficacy_map = {}
            for e in efficacies:
                if e.damage_type not in efficacy_map:
                    efficacy_map[e.damage_type] = {}
                efficacy_map[e.damage_type][e.target_type] = e.damage_factor

            features = self._extract_team_features(team_pokemon, efficacy_map)
            feature_vector = np.array([features.get(col, 0) for col in self._get_feature_columns()]).reshape(1, -1)
            feature_vector_scaled = self.scaler.transform(feature_vector)

            # Get probability of being a good team (class 1)
            probability = self.model.predict_proba(feature_vector_scaled)[0][1]
            return float(probability)

        except Exception as e:
            logger.error(f"Error predicting team quality: {e}")
            return 0.5
        finally:
            db.close()

    def suggest_pokemon_for_team(self, current_team: List[Pokemon],
                                all_pokemon: List[Pokemon],
                                efficacy_map: Dict[str, Dict[str, float]],
                                top_n: int = 5) -> List[Dict]:
        """Suggest Pokemon that would improve the team based on ML model"""
        if not current_team:
            # Return popular/best pokemon if no team
            return self._get_popular_pokemon(all_pokemon, top_n)

        if not self.is_trained or self.model is None:
            logger.warning("Model not trained, falling back to heuristic")
            from .utils import suggest_pokemon
            return suggest_pokemon(current_team, all_pokemon, efficacy_map)[:top_n]

        current_score = self.predict_team_quality(current_team)

        suggestions = []
        team_ids = [p.id for p in current_team]

        for pokemon in all_pokemon:
            if pokemon.id in team_ids:
                continue

            # Try adding this pokemon to the team
            test_team = current_team + [pokemon]
            if len(test_team) > 6:
                # If team would be too big, try replacing each member
                best_improvement = 0
                best_replacement = None

                for i, old_pokemon in enumerate(current_team):
                    test_team = current_team.copy()
                    test_team[i] = pokemon

                    new_score = self.predict_team_quality(test_team)
                    improvement = new_score - current_score

                    if improvement > best_improvement:
                        best_improvement = improvement
                        best_replacement = (old_pokemon, pokemon, improvement)

                if best_replacement and best_improvement > 0:
                    old_poke, new_poke, improvement = best_replacement
                    suggestions.append({
                        "pokemon": new_poke,
                        "improvement": improvement,
                        "reasoning": [
                            f"ML model predicts {improvement:.3f} improvement by replacing {old_poke.name} with {new_poke.name}",
                            f"Expected team quality: {current_score + improvement:.3f}"
                        ],
                        "score": current_score + improvement,
                        "replaces": old_poke.name
                    })
            else:
                # Team has space, just add the pokemon
                test_team = current_team + [pokemon]
                new_score = self.predict_team_quality(test_team)
                improvement = new_score - current_score

                if improvement > 0:  # Only suggest if it improves the team
                    suggestions.append({
                        "pokemon": pokemon,
                        "improvement": improvement,
                        "reasoning": [
                            f"ML model predicts {improvement:.3f} improvement by adding {pokemon.name}",
                            f"Expected team quality: {current_score + improvement:.3f}"
                        ],
                        "score": current_score + improvement
                    })

        # Sort by improvement and return top N
        suggestions.sort(key=lambda x: x["improvement"], reverse=True)
        return suggestions[:top_n]

    def _get_popular_pokemon(self, all_pokemon: List[Pokemon], top_n: int) -> List[Dict]:
        """Get popular pokemon when no team exists"""
        # Sort by BST (simple heuristic for popular/powerful pokemon)
        sorted_pokemon = sorted(all_pokemon,
                              key=lambda p: (p.hp or 0) + (p.attack or 0) + (p.defense or 0) +
                                           (p.special_attack or 0) + (p.special_defense or 0) + (p.speed or 0),
                              reverse=True)

        suggestions = []
        for pokemon in sorted_pokemon[:top_n]:
            bst = (pokemon.hp or 0) + (pokemon.attack or 0) + (pokemon.defense or 0) + \
                  (pokemon.special_attack or 0) + (pokemon.special_defense or 0) + (pokemon.speed or 0)

            suggestions.append({
                "pokemon": pokemon,
                "improvement": 0.0,  # No baseline for empty team
                "reasoning": [
                    f"High BST pokemon: {bst} total stats",
                    "Good starting point for team building"
                ],
                "score": bst / 600.0,  # Normalize to 0-1 range
                "is_starter": True
            })

        return suggestions

    def _save_model(self):
        """Save the trained model to disk"""
        try:
            model_data = {
                'model': self.model,
                'scaler': self.scaler,
                'feature_columns': self.feature_columns,
                'is_trained': self.is_trained
            }
            joblib.dump(model_data, self.model_path)
            logger.info(f"Model saved to {self.model_path}")
        except Exception as e:
            logger.error(f"Error saving model: {e}")

    def _load_model(self):
        """Load a pre-trained model from disk"""
        try:
            if os.path.exists(self.model_path):
                model_data = joblib.load(self.model_path)
                self.model = model_data['model']
                self.scaler = model_data['scaler']
                self.feature_columns = model_data['feature_columns']
                self.is_trained = model_data['is_trained']
                logger.info(f"Model loaded from {self.model_path}")
            else:
                logger.info("No pre-trained model found")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.is_trained = False

# Global instance
team_recommender = TeamRecommender()