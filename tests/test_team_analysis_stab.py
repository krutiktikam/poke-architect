from backend.utils import evaluate_stab


def test_team_analysis_minimal_valid_two_pokemon_team(client):
    """
    POST /api/team-analysis with a minimal valid two-Pokémon team
    returns 200 and includes STAB warnings in advice.
    """
    payload = {
        "pokemon": [
            {
                "id": 25,
                "name": "Pikachu",
                "type1": "Electric",
                "hp": 35,
                "attack": 55,
                "defense": 40,
                "special_attack": 50,
                "special_defense": 50,
                "speed": 90,
                "generation": 1,
                "selectedMoves": [57],  # Surf (Water) -> Missing STAB on Electric Pokemon
            },
            {
                "id": 6,
                "name": "Charizard",
                "type1": "Fire",
                "type2": "Flying",
                "hp": 78,
                "attack": 84,
                "defense": 78,
                "special_attack": 109,
                "special_defense": 85,
                "speed": 100,
                "generation": 1,
                "selectedMoves": [53],  # Flamethrower (Fire) -> STAB present
            },
        ]
    }

    response = client.post("/api/team-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "advice" in data
    # Verify STAB warning was triggered for Pikachu and NOT for Charizard
    assert any("Pikachu: Missing STAB" in msg for msg in data["advice"])
    assert not any("Charizard: Missing STAB" in msg for msg in data["advice"])


def test_team_analysis_two_pokemon_both_stab(client):
    """
    POST /api/team-analysis with a two-Pokémon team where both have STAB moves
    returns 200 and does NOT include missing STAB warnings.
    """
    payload = {
        "pokemon": [
            {
                "id": 25,
                "name": "Pikachu",
                "type1": "Electric",
                "hp": 35,
                "attack": 55,
                "defense": 40,
                "special_attack": 50,
                "special_defense": 50,
                "speed": 90,
                "generation": 1,
                "selectedMoves": [85],  # Thunderbolt (Electric) -> STAB present
            },
            {
                "id": 6,
                "name": "Charizard",
                "type1": "Fire",
                "type2": "Flying",
                "hp": 78,
                "attack": 84,
                "defense": 78,
                "special_attack": 109,
                "special_defense": 85,
                "speed": 100,
                "generation": 1,
                "selectedMoves": [53],  # Flamethrower (Fire) -> STAB present
            },
        ]
    }

    response = client.post("/api/team-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "advice" in data
    assert not any("Missing STAB" in msg for msg in data["advice"])


def test_team_analysis_one_pokemon_team(client):
    """
    A one-Pokémon team returns whatever the endpoint currently defines (200).
    """
    payload = {
        "pokemon": [
            {
                "id": 25,
                "name": "Pikachu",
                "type1": "Electric",
                "hp": 35,
                "attack": 55,
                "defense": 40,
                "special_attack": 50,
                "special_defense": 50,
                "speed": 90,
                "generation": 1,
                "selectedMoves": [85],
            }
        ]
    }

    response = client.post("/api/team-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "total_stats" in data
    assert data["total_stats"]["speed"] == 90


def test_team_analysis_empty_team(client):
    """
    An empty team returns the endpoint's current default response (200 with empty fields).
    """
    response = client.post("/api/team-analysis", json={"pokemon": []})
    assert response.status_code == 200
    data = response.json()
    assert data["archetype"] == "None"
    assert data["health_score"] == "F"
    assert data["advice"] == []


def test_team_analysis_invalid_payloads(client):
    """
    Invalid payloads return 422 or 400 according to current validation rules.
    """
    # Missing required 'pokemon' field -> 422
    res_missing = client.post("/api/team-analysis", json={})
    assert res_missing.status_code == 422

    # Malformed pokemon field -> 422
    res_bad_type = client.post("/api/team-analysis", json={"pokemon": "not-a-list"})
    assert res_bad_type.status_code == 422

    # More than 6 Pokémon -> 400
    seven_pokemon = [
        {
            "id": 25,
            "name": f"Pikachu_{i}",
            "type1": "Electric",
            "hp": 35,
            "attack": 55,
            "defense": 40,
            "special_attack": 50,
            "special_defense": 50,
            "speed": 90,
            "generation": 1,
            "selectedMoves": [],
        }
        for i in range(7)
    ]
    res_too_many = client.post("/api/team-analysis", json={"pokemon": seven_pokemon})
    assert res_too_many.status_code == 400
    assert "max 6 Pokémon" in res_too_many.json()["detail"]


def test_evaluate_stab_unit_on_real_inputs(db_session):
    """
    Unit test for evaluate_stab directly on real inputs.
    Verifies that evaluate_stab does not raise NameError and behaves correctly.
    """
    # 1. Missing STAB: Pikachu with Water move (Surf)
    team_missing = [
        {"id": 25, "name": "Pikachu", "selectedMoves": [57]},
    ]
    warnings = evaluate_stab(team_missing, db_session)
    assert len(warnings) == 1
    assert "Pikachu: Missing STAB - none of your selected moves match your Pokémon's types" in warnings[0]

    # 2. STAB present: Pikachu with Electric move (Thunderbolt)
    team_with_stab = [
        {"id": 25, "name": "Pikachu", "selectedMoves": [85]},
    ]
    warnings_stab = evaluate_stab(team_with_stab, db_session)
    assert warnings_stab == []

    # 3. Dual-type STAB: Charizard (Fire/Flying) with Flamethrower (Fire)
    team_dual = [
        {"id": 6, "name": "Charizard", "selectedMoves": [53, 57]},
    ]
    warnings_dual = evaluate_stab(team_dual, db_session)
    assert warnings_dual == []

    # 4. No moves selected: should be skipped without warning
    team_no_moves = [
        {"id": 25, "name": "Pikachu", "selectedMoves": []},
        {"id": 6, "name": "Charizard", "selectedMoves": [None, None]},
    ]
    warnings_none = evaluate_stab(team_no_moves, db_session)
    assert warnings_none == []
