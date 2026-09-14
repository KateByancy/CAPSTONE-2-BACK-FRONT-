const fs = require('node:fs');
const path = require('node:path');

// Read the maintained knowledge file rather than relying on a model to recall these facts.
function getMarcProfileReply(message, now = new Date()) {
    const text = message.toLowerCase().replace(/[\u2019']/g, ' ');
    const namesMarc = /\b(marc|rossel|lecciones)\b/.test(text);
    const contactQuestion = /\b(phone|telephone|mobile|contact|cellphone|cp)\s*(number|no\.?|#)|\bcontact details\b|\bhow (?:can|do) i (?:contact|reach)\b|\bnumero\b/.test(text);
    // Do not mistake a client's profile edits or payment questions for a public contact inquiry.
    if (/\b(my|ako|akin|aking|ko)\b/.test(text) && !namesMarc) return null;
    if (/\b(gcash|payment|pay|bayad|otp|password|verification|reset)\b/.test(text)) return null;
    const phone = contactQuestion || (namesMarc && /\b(number|contact)\b/.test(text));
    const facebook = /\b(facebook|fb|social media)\b/.test(text);
    const address = /\b(address|location|located|live|lives|based|from|taga|saan|nasaan|tirahan)\b/.test(text);
    const birthday = /\b(birthday|birthdate|birth|born|kaarawan)\b/.test(text);
    const age = /\b(age|old|edad|gulang)\b/.test(text);
    const work = /\b(work|job|occupation|advertising|trabaho|nature of (?:work|service))\b/.test(text);
    const name = !facebook && !phone && /\b(name|pangalan)\b/.test(text);
    const profile = namesMarc && /\b(info|information|details|profile|about|sino|who)\b/.test(text);
    if (!namesMarc && !phone && !facebook) return null;
    if (!phone && !facebook && !address && !birthday && !age && !work && !name && !profile) return null;

    const knowledge = fs.readFileSync(path.join(__dirname, '../knowledge/chatbot.md'), 'utf8');
    function field(label) {
        const line = knowledge.split(/\r?\n/).find(value => value.startsWith('- ' + label + ': '));
        if (!line) throw new Error('MARC_PROFILE_FIELD_MISSING');
        return line.slice(label.length + 4);
    }
    const fullName = field('Full name').replace(/\.$/, '');
    const location = field('Provided address/location').split('. This')[0];
    const number = field('Contact number').split('.')[0];
    const social = field('Facebook account name').split('. Clients')[0];
    const birthDate = field('Date of birth').replace(/\.$/, '');
    const birth = new Date(birthDate + ' UTC');
    const years = now.getUTCFullYear() - birth.getUTCFullYear() -
        (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate()) ? 1 : 0);
    const all = profile && !phone && !facebook && !address && !birthday && !age && !work && !name;
    const answers = [];
    if (name || all) answers.push(`Full name: ${fullName}.`);
    if (phone || all) answers.push(`Marc's contact number is ${number}.`);
    if (facebook || all) answers.push(`Facebook account name: ${social}.`);
    if (address || all) answers.push(`Marc's provided location is ${location}.`);
    if (birthday || all) answers.push(`Date of birth: ${birthDate}.`);
    if (age || all) answers.push(`Marc is ${years} years old.`);
    if (work || all) {
        const description = field('Broad description');
        answers.push(`Marc's nature of work is Advertising Services. ${description} Specific services and quotations need Marc's confirmation.`);
    }
    return answers.join('\n');
}

module.exports = { getMarcProfileReply };
