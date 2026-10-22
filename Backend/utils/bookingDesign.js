const designs = require('../../Frontend/src/lib/marcDesigns.json');

// Resolve the published catalog on the server; never trust client-supplied names or descriptions.
module.exports = function bookingDesign(body, catalog = designs) {
    if (body.design_id === undefined) return null; // Retain existing booking/estimate integrations.
    const design = catalog.find(item => item.id === body.design_id);
    if (!design || body.service_type !== design.category || body.estimate != null) {
        const error = new Error('Choose a valid interior design and its matching category.');
        error.status = 400;
        throw error;
    }
    let features=design.features;
    if(typeof features==='string'){try{features=JSON.parse(features);}catch{features=[];}}
    const requirements = typeof body.project_description === 'string' ? body.project_description.trim() : '';
    if (!requirements || requirements.length > 5000) {
        const error = new Error('Enter your project requirements (up to 5,000 characters).');
        error.status = 400;
        throw error;
    }
    const rates = require('../../Frontend/src/lib/customizationRates.json');
    let adjustment = 0;
    const pricingLines = [];
    if (body.customization != null) {
        if (typeof body.customization !== 'object' || Array.isArray(body.customization) || Object.keys(body.customization).length !== Object.keys(rates).length) {
            const error = new Error('Complete all customization preferences.'); error.status=400; throw error;
        }
        for (const [category,options] of Object.entries(rates)) {
            const selected = body.customization[category];
            if (typeof selected !== 'string' || !Object.hasOwn(options, selected)) { const error = new Error('Invalid customization preference.'); error.status=400; throw error; }
            adjustment += options[selected];
            pricingLines.push(category+': '+selected+' (+'+options[selected]+'%)');
        }
    }
    if (design.price != null) {
        const base=Number(design.price), total=Math.round(base*(1+adjustment/100)*100)/100;
        pricingLines.push('Sample base price: PHP '+base.toFixed(2), 'Customization adjustment: '+adjustment+'%', 'Preliminary estimated price: PHP '+total.toFixed(2));
    }
    return { design_snapshot: {id:design.id,name:design.name,category:design.category,image:design.image}, service_type: design.category, project_description: [
        'Selected design: ' + design.name,
        'Interior category: ' + design.category,
        'Design details: ' + design.description,
        ...(Array.isArray(features) && features.length ? ['Design highlights: '+features.join('; ')] : []),
        '', ...pricingLines, '', 'Client requirements: ' + requirements,
        '', 'Final scope, measurements, finishes, and pricing are subject to consultation.'
    ].join('\n') };
};
