function generateRandomContributions(sum) {
    const count = 15
    const min = 0.5
    const max = 99
    let adjustedTotal = sum - (count * min); // Total we can freely distribute
    let points = [];

    // Generate (count - 1) random "cut points"
    for (let i = 0; i < count - 1; i++) {
        points.push(Math.random());
    }

    // Sort the cut points
    points.sort();

    // Calculate the segments between points and scale to adjustedTotal
    let values = [];
    let prev = 0;
    for (let i = 0; i < count - 1; i++) {
        const diff = points[i] - prev;
        values.push(diff * adjustedTotal);
        prev = points[i];
    }
    values.push((1 - prev) * adjustedTotal); // Final segment

    // Add the minimum to each value
    let final = values.map(v => parseFloat((v + min).toFixed(2)));

    // Cap each value at max and redistribute the excess
    let excess = 0;
    for (let i = 0; i < final.length; i++) {
        if (final[i] > max) {
            excess += final[i] - max;
            final[i] = max;
        }
    }
    // Redistribute excess
    while (excess > 0.0001) { // small epsilon to avoid infinite loop
        let distributed = false;
        for (let i = 0; i < final.length; i++) {
            if (final[i] < max) {
                let room = max - final[i];
                let add = Math.min(room, excess);
                final[i] += add;
                excess -= add;
                distributed = true;
                if (excess <= 0.0001) break;
            }
        }
        if (!distributed) break; // all values at max
    }
    // Round again after redistribution
    final = final.map(v => parseFloat(v.toFixed(2)));

    // Adjust for rounding errors to ensure exact total
    const error = final.reduce((a, b) => a + b, 0) - sum;
    final[0] = parseFloat((final[0] - error).toFixed(2));

    return final;
}

module.exports = { generateRandomContributions }