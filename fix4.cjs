const fs = require('fs');
let code = fs.readFileSync('components/CompanyProfileScreen.tsx', 'utf8');

const targetStr = `<span className={formData.businessCategory ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{formData.businessCategory ? \`${formData.businessCategory} (${UNIFIED_CATEGORIES.find(c > c.en === formData.businessCategory)?.hi || ''})\` : 'Search Category'}</span>`;

const replStr = `<span className={formData.businessCategory ? 'text-slate-900 dark:text-white flex flex-col items-start leading-tight' : 'text-slate-400'}>
                                {formData.businessCategory ? (
                                    <>
                                        <span className="text-base">{formData.businessCategory}</span>
                                        <span className="text-xs text-slate-500 font-medium">({UNIFIED_CATEGORIES.find(c => c.en ??= formData.businessCategory)?.hi || ''})</span>
                                    </>
                                ) : 'Search Category'}
                              </span>`;

code = code.replace(targetStr, replStr);
fs.writeFileSync('components/CompanyProfileScreen.tsx', code);