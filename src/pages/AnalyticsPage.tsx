import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  Users,
  Activity,
  Award,
  Briefcase,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlatformAnalytics {
  totalEscrows: number;
  activeEscrows: number;
  completedEscrows: number;
  disputedEscrows: number;
  totalVolume: string;
  totalFees: string;
  completionRate: string;
  disputeRate: string;
}

interface UserAnalytics {
  address: string;
  completedEscrows: number;
  reputation: number;
  averageRating: number;
  ratingCount: number;
  projectsAsClient: number;
  projectsAsFreelancer: number;
  totalEarned: string;
  totalSpent: string;
  activeProjects: number;
}

interface TrendsData {
  totalEscrows: number;
  statusDistribution: {
    pending: number;
    inProgress: number;
    completed: number;
    refunded: number;
    disputed: number;
    expired: number;
    cancelled: number;
  };
}

const COLORS = {
  pending: "#8b5cf6",      // Purple
  inprogress: "#06b6d4",   // Cyan
  completed: "#10b981",    // Green
  refunded: "#f59e0b",     // Orange
  disputed: "#ef4444",     // Red
  expired: "#6366f1",      // Indigo
  cancelled: "#ec4899",    // Pink
};

export default function AnalyticsPage() {
  const { wallet } = useWeb3();
  const { toast } = useToast();
  const [platformData, setPlatformData] = useState<PlatformAnalytics | null>(null);
  const [userData, setUserData] = useState<UserAnalytics | null>(null);
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";
  const API_SECRET = import.meta.env.VITE_API_SECRET || "";

  useEffect(() => {
    fetchAnalytics();
  }, [wallet.address]);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      // Fetch platform analytics
      const platformRes = await fetch(`${API_URL}/v1/analytics/platform`, {
        headers: {
          Authorization: `Bearer ${API_SECRET}`,
        },
      });
      if (platformRes.ok) {
        const platformJson = await platformRes.json();
        setPlatformData(platformJson);
      }

      // Fetch user analytics if wallet is connected
      if (wallet.address) {
        const userRes = await fetch(`${API_URL}/v1/analytics/user/${wallet.address}`, {
          headers: {
            Authorization: `Bearer ${API_SECRET}`,
          },
        });
        if (userRes.ok) {
          const userJson = await userRes.json();
          setUserData(userJson);
        }
      }

      // Fetch trends
      const trendsRes = await fetch(`${API_URL}/v1/analytics/trends`, {
        headers: {
          Authorization: `Bearer ${API_SECRET}`,
        },
      });
      if (trendsRes.ok) {
        const trendsJson = await trendsRes.json();
        setTrendsData(trendsJson);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load analytics",
        description: error.message || "Could not fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics();
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const statusChartData = trendsData
    ? Object.entries(trendsData.statusDistribution)
        .filter(([_, value]) => value > 0) // Only show statuses with values
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1'),
          value,
          key: name.toLowerCase(),
        }))
    : [];

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-xl text-muted-foreground">
              Platform metrics and user statistics
            </p>
          </div>
          <Button
            variant="outline"
            size="default"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="platform" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="platform">Platform</TabsTrigger>
            <TabsTrigger value="user" disabled={!wallet.isConnected}>
              My Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="platform" className="space-y-6">
            {/* Platform Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Escrows</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {platformData?.totalEscrows || 0}
                    </h3>
                  </div>
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
              </Card>

              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {platformData?.activeEscrows || 0}
                    </h3>
                  </div>
                  <Activity className="h-8 w-8 text-cyan-500" />
                </div>
              </Card>

              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Volume</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {platformData?.totalVolume
                        ? `${parseFloat(platformData.totalVolume).toFixed(2)} USDC`
                        : "0 USDC"}
                    </h3>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </Card>

              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                    <h3 className="text-3xl font-bold mt-2">
                      {platformData?.completionRate || 0}%
                    </h3>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Status Distribution Pie Chart */}
              <Card className="glass border-primary/20 p-6">
                <h3 className="text-xl font-bold mb-4">Escrow Status Distribution</h3>
                {statusChartData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={statusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value, percent }: any) =>
                            value > 0 ? `${name}: ${value} (${((percent as number) * 100).toFixed(0)}%)` : ''
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusChartData.map((entry: any) => (
                            <Cell 
                              key={`cell-${entry.key}`} 
                              fill={COLORS[entry.key as keyof typeof COLORS] || "#8b5cf6"} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} escrows`, 'Count']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      {statusChartData.map((entry: any) => (
                        <div key={entry.key} className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[entry.key as keyof typeof COLORS] || "#8b5cf6" }}
                          />
                          <span className="text-muted-foreground">
                            {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No escrow data available
                  </div>
                )}
              </Card>

              {/* Platform Metrics Bar Chart */}
              <Card className="glass border-primary/20 p-6">
                <h3 className="text-xl font-bold mb-4">Platform Metrics</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: "Metrics",
                        Active: platformData?.activeEscrows || 0,
                        Completed: platformData?.completedEscrows || 0,
                        Disputed: platformData?.disputedEscrows || 0,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Active" fill="#06b6d4" />
                    <Bar dataKey="Completed" fill="#10b981" />
                    <Bar dataKey="Disputed" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Additional Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{platformData?.completedEscrows || 0}</p>
                  </div>
                </div>
              </Card>

              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-red-500/10">
                    <Activity className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dispute Rate</p>
                    <p className="text-2xl font-bold">{platformData?.disputeRate || 0}%</p>
                  </div>
                </div>
              </Card>

              <Card className="glass border-primary/20 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <DollarSign className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Platform Fees</p>
                    <p className="text-2xl font-bold">
                      {platformData?.totalFees
                        ? `${parseFloat(platformData.totalFees).toFixed(4)} USDC`
                        : "0 USDC"}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="user" className="space-y-6">
            {userData && (
              <>
                {/* User Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="glass border-primary/20 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Reputation</p>
                        <h3 className="text-3xl font-bold mt-2">{userData.reputation}</h3>
                      </div>
                      <Award className="h-8 w-8 text-yellow-500" />
                    </div>
                  </Card>

                  <Card className="glass border-primary/20 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Average Rating
                        </p>
                        <h3 className="text-3xl font-bold mt-2">
                          {userData.averageRating.toFixed(1)} ⭐
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {userData.ratingCount} ratings
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-purple-500" />
                    </div>
                  </Card>

                  <Card className="glass border-primary/20 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                        <h3 className="text-3xl font-bold mt-2">
                          {parseFloat(userData.totalEarned).toFixed(2)} USDC
                        </h3>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </Card>

                  <Card className="glass border-primary/20 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Projects</p>
                        <h3 className="text-3xl font-bold mt-2">{userData.activeProjects}</h3>
                      </div>
                      <Activity className="h-8 w-8 text-cyan-500" />
                    </div>
                  </Card>
                </div>

                {/* User Activity Chart */}
                <Card className="glass border-primary/20 p-6">
                  <h3 className="text-xl font-bold mb-4">Your Activity</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        {
                          name: "Projects",
                          "As Client": userData.projectsAsClient,
                          "As Freelancer": userData.projectsAsFreelancer,
                          Completed: userData.completedEscrows,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="As Client" fill="#8b5cf6" />
                      <Bar dataKey="As Freelancer" fill="#06b6d4" />
                      <Bar dataKey="Completed" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Financial Overview */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="glass border-primary/20 p-6">
                    <h3 className="text-lg font-bold mb-4">Earnings Overview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Earned</span>
                        <span className="font-bold">
                          {parseFloat(userData.totalEarned).toFixed(4)} USDC
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Projects as Freelancer</span>
                        <span className="font-bold">{userData.projectsAsFreelancer}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Completed Projects</span>
                        <span className="font-bold">{userData.completedEscrows}</span>
                      </div>
                    </div>
                  </Card>

                  <Card className="glass border-primary/20 p-6">
                    <h3 className="text-lg font-bold mb-4">Spending Overview</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Spent</span>
                        <span className="font-bold">
                          {parseFloat(userData.totalSpent).toFixed(4)} USDC
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Projects as Client</span>
                        <span className="font-bold">{userData.projectsAsClient}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Projects</span>
                        <span className="font-bold">{userData.activeProjects}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
