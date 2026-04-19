import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Loader2, MessageSquare, ChevronRight, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useTeam } from '../context/TeamContext';
import CompareModal from '../components/CompareModal';
import TeamSkeleton from '../components/TeamSkeleton';

const Community = () => {
  const { team: myTeam } = useTeam();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [myAnalysis, setMyAnalysis] = useState<any>(null);
  const [theirAnalysis, setTheirAnalysis] = useState<any>(null);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchPublicTeams();
  }, []);

  const fetchPublicTeams = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/teams/public`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching public teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async (team: any) => {
    if (myTeam.length === 0) {
      alert('Add at least one Pokémon to your team to compare!');
      return;
    }
    setComparing(true);
    setSelectedTeam(team);
    try {
      const [myRes, theirRes, compRes] = await Promise.all([
        axios.post(`${API_BASE_URL}/team-analysis`, myTeam.map(p => p.id)),
        axios.post(`${API_BASE_URL}/team-analysis`, team.pokemon_ids),
        axios.post(`${API_BASE_URL}/compare-teams`, {
          team_a_ids: myTeam.map(p => p.id),
          team_b_ids: team.pokemon_ids
        })
      ]);
      setMyAnalysis(myRes.data);
      setTheirAnalysis(theirRes.data);
      setComparisonData(compRes.data);
      setIsCompareOpen(true);
    } catch (error) {
      console.error('Error comparing teams:', error);
      alert('Failed to analyze teams for comparison.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ... existing header ... */}

      {/* ... existing loading/teams grid ... */}

      {isCompareOpen && (
        <CompareModal 
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          myTeam={myTeam}
          theirTeam={selectedTeam?.pokemon_ids || []}
          myAnalysis={myAnalysis}
          theirAnalysis={theirAnalysis}
          comparisonData={comparisonData}
        />
      )}
    </div>
  );
};

export default Community;
