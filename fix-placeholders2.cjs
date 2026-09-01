const fs = require('fs');
const path = require('path');
const glob = require('glob');

const appDir = path.join(__dirname, 'src/app');
const files = glob.sync('**/page.tsx', { cwd: appDir });

const replacements = [
  // Audience variants
  { from: 'placeholder="e.g., women 25-40 interested in clean beauty (optional)"', to: "placeholder={t('common.phAudienceCleanBeautyOpt')}" },
  { from: 'placeholder="e.g., Women 25-40 interested in skincare and self-care"', to: "placeholder={t('common.phAudienceSelfCare')}" },
  { from: 'placeholder="e.g., women 25-40 interested in skincare and self-care"', to: "placeholder={t('common.phAudienceSelfCare')}" },
  { from: 'placeholder="e.g., women 25-40 interested in clean beauty"', to: "placeholder={t('common.phAudienceCleanBeauty')}" },
  { from: 'placeholder="e.g., Women 25-40 interested in clean beauty"', to: "placeholder={t('common.phAudienceCleanBeauty')}" },
  { from: 'placeholder="e.g., Women 25-40 concerned about skin aging"', to: "placeholder={t('common.phAudienceConcern')}" },
  { from: 'placeholder="e.g., women 25-40 concerned about skin aging"', to: "placeholder={t('common.phAudienceConcern')}" },
  { from: 'placeholder="e.g., millennial skincare enthusiasts"', to: "placeholder={t('common.phMillennial')}" },
  // Brand/tone/keywords
  { from: 'placeholder="e.g., Acme"', to: "placeholder={t('common.phAcme')}" },
  { from: 'placeholder="e.g., Acme noise-cancelling headphones"', to: "placeholder={t('common.phAcmeHeadphones')}" },
  { from: 'placeholder="e.g., playful, professional"', to: "placeholder={t('common.phToneProfessional')}" },
  { from: 'placeholder="e.g., playful, bold, luxurious (optional)"', to: "placeholder={t('common.phToneLuxurious')}" },
  { from: 'placeholder="e.g., playful, bold"', to: "placeholder={t('common.phTone')}" },
  { from: 'placeholder="e.g., quality, affordable"', to: "placeholder={t('common.phKeywords')}" },
  { from: 'placeholder="e.g., #FF0000, #00B2FC"', to: "placeholder={t('common.phColors')}" },
  { from: 'placeholder="e.g., Inter, Roboto"', to: "placeholder={t('common.phFonts')}" },
  // URL/optional
  { from: 'placeholder="https://..."', to: "placeholder={t('common.phUrl')}" },
  { from: 'placeholder="optional"', to: "placeholder={t('common.phOptional')}" },
  { from: 'placeholder="optional %"', to: "placeholder={t('common.phOptionalPercent')}" },
  { from: 'placeholder="optional $"', to: "placeholder={t('common.phOptionalDollar')}" },
  { from: 'placeholder="50"', to: "placeholder={t('common.ph50')}" },
];

let totalReplacements = 0;
let totalFiles = 0;

for (const file of files) {
  const filePath = path.join(appDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const r of replacements) {
    if (content.includes(r.from)) {
      const count = content.split(r.from).length - 1;
      content = content.split(r.from).join(r.to);
      totalReplacements += count;
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    totalFiles++;
  }
}

console.log(`Modified ${totalFiles} files, ${totalReplacements} replacements`);

// Report remaining
const remaining = [];
for (const file of files) {
  const filePath = path.join(appDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(/placeholder="[^{][^"]*"/g);
  if (matches) {
    for (const m of matches) {
      if (m !== 'placeholder=""') remaining.push(m);
    }
  }
}
console.log(`\nRemaining: ${remaining.length} placeholders`);
const unique = [...new Set(remaining)].sort();
console.log(`Unique remaining: ${unique.length}`);
