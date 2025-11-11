// --- 1. CORE DATA STRUCTURES & CONSTANTS ---
const cityCoordinates = {
    "Nalanda": [25.1311, 85.4468],
    "Rajgir": [25.0458, 85.4290],
    "Gaya": [24.7937, 85.0003],
    "Pawapuri": [25.2100, 85.5342],
    "Kakolat": [24.6300, 85.5900]
};

const DAILY_EXPENSE_RATE = 500; // Fixed cost per day 

const routesData = [
    { from: "Nalanda", to: "Rajgir", dist: 15, cost: 200, days: 1 },
    { from: "Rajgir", to: "Gaya", dist: 35, cost: 400, days: 1 },
    { from: "Nalanda", to: "Pawapuri", dist: 25, cost: 250, days: 1 },
    { from: "Pawapuri", to: "Gaya", dist: 30, cost: 300, days: 1 },
    { from: "Gaya", to: "Kakolat", dist: 50, cost: 600, days: 2 },
    { from: "Rajgir", to: "Pawapuri", dist: 20, cost: 250, days: 1 },
    { from: "Pawapuri", to: "Kakolat", dist: 55, cost: 650, days: 2 },
    { from: "Nalanda", to: "Gaya", dist: 40, cost: 450, days: 1 }
];

const adj = new Map();
routesData.forEach(route => {
    const addRoute = (from, to, data) => {
        if (!adj.has(from)) adj.set(from, []);
        adj.get(from).push({ city: to, ...data });
    };
    addRoute(route.from, route.to, route);
    addRoute(route.to, route.from, route);
});

let calculatedRoutes = []; 

// --- 2. CORE ALGORITHMS ---

// BFS for quick connectivity check (Robustness)
function isConnected(start, end) {
    if (start === end) return true;
    if (!adj.has(start) || !adj.has(end)) return false;

    const queue = [start];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const currentCity = queue.shift();
        
        for (const route of adj.get(currentCity)) {
            if (route.city === end) return true;
            if (!visited.has(route.city)) {
                visited.add(route.city);
                queue.push(route.city);
            }
        }
    }
    return false;
}

// Helper function for normalization
const normalize = (value, min, max) => (max === min) ? 0 : (value - min) / (max - min);

// DFS for finding routes (Corrected Budget Pruning)
function findRoutes(start, end, budget, preference, costPriority) {
    let results = [];

    // Path, totalDist, totalDays, totalTravelCost, cumulativeCost (for pruning)
    function dfs(path, totalDist, totalDays, totalTravelCost) {
        let currentCity = path[path.length - 1];
        
        if (currentCity === end) {
             const finalDailyCost = totalDays * DAILY_EXPENSE_RATE;
             const finalTotalCost = totalTravelCost + finalDailyCost;

            // Final Budget Check
            if (finalTotalCost > budget) return; 

            results.push({ 
                path: [...path], 
                dist: totalDist, 
                cost: finalTotalCost, 
                days: totalDays,
                travelCost: totalTravelCost, 
                dailyCost: finalDailyCost   
            });
            return;
        }

        if (adj.has(currentCity)) {
            for (let route of adj.get(currentCity)) {
                if (!path.includes(route.city)) {
                    
                    const segmentTravelCost = route.cost; 
                    const segmentDays = route.days;
                    
                    const newTotalTravelCost = totalTravelCost + segmentTravelCost;
                    const newTotalDays = totalDays + segmentDays;

                    // Prune if estimated cost of the *next* segment pushes the total cost too high.
                    const estimatedFinalCost = newTotalTravelCost + (newTotalDays * DAILY_EXPENSE_RATE);

                    if (estimatedFinalCost > budget) {
                         continue; 
                    }

                    dfs(
                        [...path, route.city], 
                        totalDist + route.dist, 
                        newTotalDays, 
                        newTotalTravelCost
                    );
                }
            }
        }
    }

    // Initial DFS call: Start with all zero sums
    dfs([start], 0, 0, 0); 

    if (results.length === 0) return results;

    // --- Scoring and Sorting Logic ---

    // Dynamic Weight Calculation
    const costWeight = 0.5 + (-costPriority / 100) * 0.3; 
    const timeWeight = 1 - costWeight; 
    const distWeight = timeWeight * 0.6; 
    const daysWeight = timeWeight * 0.4; 
    
    // Get Min/Max for Normalization
    const minCost = Math.min(...results.map(r => r.cost));
    const maxCost = Math.max(...results.map(r => r.cost));
    const minDist = Math.min(...results.map(r => r.dist));
    const maxDist = Math.max(...results.map(r => r.dist));
    const minDays = Math.min(...results.map(r => r.days));
    const maxDays = Math.max(...results.map(r => r.days));

    results.forEach(r => {
        const normCost = normalize(r.cost, minCost, maxCost);
        const normDist = normalize(r.dist, minDist, maxDist);
        const normDays = normalize(r.days, minDays, maxDays);
        
        r.primaryScore = 0; 

        if (preference === "shortest") {
            // Low score is BEST
            r.primaryScore = (normCost * costWeight) + (normDist * distWeight) + (normDays * daysWeight);
        } else if (preference === "longest") {
            // High score is BEST
            const revNormDist = 1 - normDist;
            const revNormDays = 1 - normDays;
            r.primaryScore = (revNormDist * 0.5) + (revNormDays * 0.5) + (1 - normCost * 0.1); 
        }
    });

    // Apply the primary sort order
    results.sort((a, b) => {
        if (preference === "shortest") {
            return a.primaryScore - b.primaryScore; // Ascending: Best (Low Score) first
        } else if (preference === "longest") {
            return b.primaryScore - a.primaryScore; // Descending: Best (High Score) first
        }
        return a.cost - b.cost;
    });

    return results;
}


// --- 3. UI/UX & EVENT HANDLERS ---
const budgetInput = document.getElementById("budget");
const budgetValue = document.getElementById("budgetValue");
const budgetTooltip = document.getElementById("budget-tooltip");
const routeForm = document.getElementById("routeForm");
const startCitySelect = document.getElementById("startCity");
const endCitySelect = document.getElementById("endCity");
const resultsDiv = document.getElementById("results");
const validationMessageDiv = document.getElementById("validation-message");
const loadingSpinner = document.getElementById("loading-spinner");
const mapCard = document.getElementById('map-card');
const costPriorityInput = document.getElementById('costPriority');
const priorityText = document.getElementById('priorityText');
// Removed: maxStopsInput and intermediateCity elements 
let myMap = null; 

function showValidationMessage(message) {
    validationMessageDiv.textContent = message;
    validationMessageDiv.classList.add("show");
    setTimeout(() => { validationMessageDiv.classList.remove("show"); }, 5000);
}

function handleCitySelection() {
    const start = startCitySelect.value;
    const end = endCitySelect.value;
    
    [...startCitySelect.options].forEach(opt => opt.disabled = false);
    [...endCitySelect.options].forEach(opt => opt.disabled = false);

    if (start) {
        const endOption = endCitySelect.querySelector(`option[value="${start}"]`);
        if (endOption) endOption.disabled = true;
    }
    if (end) {
        const startOption = startCitySelect.querySelector(`option[value="${end}"]`);
        if (startOption) startOption.disabled = true;
    }

    if (start && start === end) {
        showValidationMessage("Start and destination cities cannot be the same!");
        if (startCitySelect.value === endCitySelect.value) {
            endCitySelect.value = "";
        }
    }
}

startCitySelect.addEventListener("change", handleCitySelection);
endCitySelect.addEventListener("change", handleCitySelection);

function updateBudgetDisplay() {
    const budget = budgetInput.value;
    budgetValue.textContent = budget;

    const min = budgetInput.min;
    const max = budgetInput.max;
    const percent = (budget - min) / (max - min);
    
    const trackWidth = budgetInput.offsetWidth;
    const thumbOffset = 15; 
    let tooltipPos = percent * trackWidth - thumbOffset;

    if (tooltipPos < 0) tooltipPos = 0;
    if (tooltipPos > trackWidth - 30) tooltipPos = trackWidth - 30; 

    budgetTooltip.style.left = `${tooltipPos}px`;
    budgetTooltip.textContent = `₹ ${Number(budget).toLocaleString()}`;
}

budgetInput.addEventListener("input", updateBudgetDisplay);
budgetInput.addEventListener("mouseover", () => { budgetTooltip.style.opacity = '1'; });
budgetInput.addEventListener("mouseout", () => { budgetTooltip.style.opacity = '0'; });
budgetInput.addEventListener("change", updateBudgetDisplay); 
updateBudgetDisplay(); 

costPriorityInput.addEventListener('input', () => {
    const value = parseInt(costPriorityInput.value);
    if (value === 0) priorityText.textContent = "Balanced";
    else if (value > 0) priorityText.textContent = `Time Focused (${value}%)`;
    else priorityText.textContent = `Cost Focused (${-value}%)`;
});


function drawRouteOnMap(route, start, end, resetMap = true) {
    mapCard.style.display = 'block';

    if (resetMap || !myMap) {
        if (myMap) myMap.remove();
        myMap = L.map('routeMap').setView(cityCoordinates[start], 11);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(myMap);
        
        L.marker(cityCoordinates[start]).addTo(myMap)
            .bindPopup(`**Start: ${start}**`).openPopup();
        L.marker(cityCoordinates[end], {icon: L.icon({
            iconUrl: 'https://unpkg.com/leaflet/dist/images/marker-icon-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34]
        })}).addTo(myMap)
            .bindPopup(`**Destination: ${end}**`);

        route.path.slice(1, -1).forEach(city => {
            L.circleMarker(cityCoordinates[city], {
                radius: 6,
                color: '#3498db',
                fillColor: '#2980b9',
                fillOpacity: 0.8
            }).addTo(myMap).bindPopup(`Stop: ${city}`);
        });

    } else {
        myMap.eachLayer(layer => {
            if (layer instanceof L.Polyline) {
                myMap.removeLayer(layer);
            }
        });
    }
    
    const routeCoords = route.path.map(city => cityCoordinates[city]);
    
    L.polyline(routeCoords, {
        color: '#e74c3c', 
        weight: 8,
        opacity: 0.9,
        dashArray: '10, 5'
    }).addTo(myMap);

    if (resetMap) {
        myMap.fitBounds(L.polyline(routeCoords).getBounds(), { padding: [50, 50] });
    }
}


// Main form submission handler
routeForm.addEventListener("submit", (e) => {
    e.preventDefault(); 

    const start = startCitySelect.value;
    const end = endCitySelect.value;
    const budget = Number(budgetInput.value);
    const preference = document.getElementById("preference").value;
    const sortBy = document.getElementById("sortBy").value;
    const costPriority = Number(costPriorityInput.value); 
    
    // Removed: maxStops and intermediateCity variables

    if (!start || !end || !preference) {
        showValidationMessage("Please ensure a Start City, Destination City, and Route Preference are selected.");
        return;
    }
    if (start === end) {
        showValidationMessage("Start and Destination must be different cities.");
        return;
    }
    
    // Connectivity Check
    if (!isConnected(start, end)) {
        loadingSpinner.style.display = "none";
        resultsDiv.style.opacity = '1';
        mapCard.style.display = 'none';
        resultsDiv.innerHTML = `<p class="initial-message">❌ **Connectivity Error:** A route between **${start}** and **${end}** does not exist in our current network data.</p>`;
        return;
    }

    resultsDiv.innerHTML = "";
    loadingSpinner.style.display = "block";
    resultsDiv.style.opacity = '0.5';
    mapCard.style.display = 'none';

    setTimeout(() => {
        // Calling findRoutes without the removed parameters
        let routesFound = findRoutes(start, end, budget, preference, costPriority); 

        calculatedRoutes = routesFound; 

        loadingSpinner.style.display = "none";
        resultsDiv.style.opacity = '1';

        if (routesFound.length === 0) {
            resultsDiv.innerHTML = `<p class="initial-message">😢 No feasible routes found within the budget. Try increasing your budget.</p>`;
            return;
        }

        // SECONDARY SORTING LOGIC 
        if (sortBy === "distance") routesFound.sort((a, b) => a.dist - b.dist);
        else if (sortBy === "days") routesFound.sort((a, b) => a.days - b.days);
        else if (sortBy === "cost") routesFound.sort((a, b) => a.cost - b.cost); 
        // If sorting by score, the primary sort already handles it.

        // Render Results
        routesFound.forEach((r, i) => {
            const div = document.createElement("div");
            div.classList.add("route-card");
            // Highlight the best result after the final secondary sort
            if (i === 0) div.classList.add("selected"); 

            div.dataset.routeIndex = i; 
            
            // Safety check for division by zero
            const travelPct = r.cost > 0 ? ((r.travelCost / r.cost) * 100).toFixed(0) : 0;
            const dailyPct = r.cost > 0 ? (100 - travelPct).toFixed(0) : 0;

            div.innerHTML = `
                <h3>Route ${i + 1} ${i === 0 ? '<span class="tag">Optimal Match</span>' : ''}</h3>
                <p class="path">Path: <strong>${r.path.join(" → ")}</strong></p>
                
                <p><i class="fas fa-road"></i> **Distance:** <strong>${r.dist} km</strong></p>
                <p><i class="fas fa-calendar-day"></i> **Days:** <strong>${r.days}</strong></p>
                <p><i class="fas fa-wallet"></i> **Total Cost:** <strong>₹ ${r.cost.toLocaleString()}</strong></p>
                
                <div class="cost-breakdown" style="grid-column: 1 / -1; margin-top: 10px;">
                    <p style="font-size:0.9em; margin-bottom: 5px;">
                        **Breakdown:** Travel (${travelPct}%) | Daily (${dailyPct}%)
                    </p>
                    <div class="progress-bar">
                        <div style="width: ${travelPct}%; background-color: var(--primary-color);"></div>
                        <div style="width: ${dailyPct}%; background-color: var(--accent-color);"></div>
                    </div>
                </div>
            `;
            resultsDiv.appendChild(div);
        });
        
        document.getElementById("results-container").scrollIntoView({ behavior: 'smooth', block: 'start' });

        if (routesFound.length > 0) {
            drawRouteOnMap(routesFound[0], start, end, true);
        }

    }, 500); 
});

// Event Delegation for Interactive Map Selection
resultsDiv.addEventListener('click', (e) => {
    const card = e.target.closest('.route-card');
    if (!card) return;

    document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
    
    card.classList.add('selected');
    
    const index = parseInt(card.dataset.routeIndex);
    const selectedRoute = calculatedRoutes[index];
    
    if (selectedRoute) {
        const start = startCitySelect.value;
        const end = endCitySelect.value;
        drawRouteOnMap(selectedRoute, start, end, false); 
    }
});