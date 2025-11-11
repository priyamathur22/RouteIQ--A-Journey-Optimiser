#include <iostream>
#include <vector>
#include <string>
#include <climits>
using namespace std;

struct Edge {
    int to;
    int dist;
    int cost;
    int days;
};

struct Route {
    vector<int> path;
    int totalDist, totalCost, totalDays;
};

vector<vector<Edge>> graph;
vector<string> cityNames = {"", "Nalanda", "Rajgir", "Gaya", "Pawapuri", "Kakolat"};

void addEdge(int u, int v, int dist, int cost, int days) {
    graph[u].push_back({v, dist, cost, days});
    graph[v].push_back({u, dist, cost, days});
}

void dfs(int u, int t, vector<int>& visited, vector<int>& path,
         int dist, int cost, int days, int budget, vector<Route>& results) {
    if (cost > budget) return;
    if (u == t) {
        results.push_back({path, dist, cost, days});
        return;
    }
    for (auto& e : graph[u]) {
        if (!visited[e.to]) {
            visited[e.to] = 1;
            path.push_back(e.to);
            dfs(e.to, t, visited, path, dist + e.dist, cost + e.cost, days + e.days, budget, results);
            path.pop_back();
            visited[e.to] = 0;
        }
    }
}

int main() {
    int n = 5;
    graph.assign(n + 1, {});
    addEdge(1, 2, 15, 200, 1);
    addEdge(2, 3, 35, 400, 1);
    addEdge(1, 4, 25, 250, 1);
    addEdge(4, 3, 30, 300, 1);
    addEdge(3, 5, 50, 600, 2);
    addEdge(2, 4, 20, 250, 1);
    addEdge(4, 5, 55, 650, 2);
    addEdge(1, 3, 40, 450, 1);

    cout << "=== Journey Optimization (C++ Backend) ===\n";
    cout << "Cities:\n";
    for (int i = 1; i <= n; ++i)
        cout << i << ". " << cityNames[i] << "\n";

    int s, t, budget;
    cout << "\nEnter start city number: ";
    cin >> s;
    cout << "Enter destination city number: ";
    cin >> t;
    cout << "Enter your budget (₹): ";
    cin >> budget;

    vector<Route> results;
    vector<int> visited(n + 1, 0), path;
    visited[s] = 1;
    path.push_back(s);
    dfs(s, t, visited, path, 0, 0, 0, budget, results);

    if (results.empty()) {
        cout << "\nNo routes found within your budget.\n";
        return 0;
    }

    cout << "\nFeasible routes:\n";
    for (auto& r : results) {
        for (int i = 0; i < r.path.size(); ++i)
            cout << cityNames[r.path[i]] << (i + 1 < r.path.size() ? " -> " : "");
        cout << " | Cost: ₹" << r.totalCost << " | Dist: " << r.totalDist
             << " km | Days: " << r.totalDays << "\n";
    }

    return 0;
}
