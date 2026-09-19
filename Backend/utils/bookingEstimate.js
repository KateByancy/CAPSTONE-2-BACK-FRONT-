const multipliers = { 'Living room': 1, Kitchen: 1.25, Office: 1.1, 'Commercial room': 1.5 };

function calculateEstimate(input, pricing) {
    const { area, unit, service, style, complexity } = input;
    const value = (type, name) => Number(pricing.find(row => row.option_type === type && row.name === name)?.value);
    const rate = value('style', style);
    const multiplier = value('complexity', complexity);
    const minimum = value('estimate', 'Minimum factor');
    const maximum = value('estimate', 'Maximum factor');
    const serviceMultiplier = Object.hasOwn(multipliers, service) ? multipliers[service] : NaN;
    const base = Number(area) * (unit === 'sq ft' ? 0.09290304 : 1) * rate * multiplier * serviceMultiplier;
    if (!['sq ft', 'm\u00b2'].includes(unit) || !Number.isFinite(Number(area)) || Number(area) <= 0 || ![rate, multiplier, minimum, maximum, base].every(n => Number.isFinite(n) && n > 0) || maximum < minimum || base * maximum > Number.MAX_SAFE_INTEGER) {
        const error = new Error('Please provide a valid area, measurement unit and estimate options.');
        error.status = 400;
        throw error;
    }
    return { area: Number(area), unit, service, style, complexity, min: Math.round(base * minimum), max: Math.round(base * maximum) };
}
module.exports = { calculateEstimate };
