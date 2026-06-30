const fs = require('fs');

const rawInput = `1. Grocery Shopkeeper - किराना दुकानदार
2. Vegetable Seller - सब्ज़ीवाला
3. Fruit Seller - फलवाला
4. Milkman - दूधवाला
5. Cobbler - मोची
6. Barber - नाई
7. Tea Seller - चायवाला
8. Betel Seller - पानवाला
9. Electronics Shopkeeper - इलेक्ट्रॉनिक्स दुकानदार
10. Mobile Accessories Seller - मोबाइल एक्सेसरीज़ दुकानदार
11. Utensil Seller - बर्तन दुकानदार
12. Stationery Seller - स्टेशनरी दुकानदार
13. Book Seller - किताब दुकानदार
14. Jewelry Seller - ज्वेलरी दुकानदार
15. Cyber Cafe Operator - साइबर कैफे ऑपरेटर
16. Sweet Shopkeeper - मिठाई दुकानदार
17. Bakery Operator - बेकरी संचालक
18. Photo Studio Operator - फोटो स्टूडियो संचालक
19. Hardware Shopkeeper - हार्डवेयर दुकानदार
20. Spare Parts Seller - स्पेयर पार्ट्स विक्रेता
21. Salon Worker - सैलून कर्मचारी
22. Beauty Parlor Worker - ब्यूटी पार्लर कर्मचारी
23. Automobile Mechanic - ऑटोमोबाइल मैकेनिक
24. Computer Repair Expert - कंप्यूटर रिपेयरिंग एक्सपर्ट
25. Gift Shop Owner - गिफ्ट शॉप संचालक
26. Craft Shop Owner - क्राफ्ट शॉप संचालक
27. Dairy Booth Operator - डेयरी बूथ ऑपरेटर
28. Tyre Seller - टायर विक्रेता
29. Ice Cream Parlor Operator - आइसक्रीम पार्लर ऑपरेटर
30. Pure Veg Hotel Operator - प्योर वेज होटल संचालक
31. Non-Veg Hotel Operator - नॉन-वेज होटल संचालक
32. Ayurvedic Shopkeeper - आयुर्वेदिक दुकानदार
33. Plastic Goods Seller - प्लास्टिक आइटम विक्रेता
34. Wholesale Trader - थोक व्यापारी
35. Transport Agent - ट्रांसपोर्ट एजेंट
36. Lighting and Decoration Seller - लाइटिंग और डेकोरेशन विक्रेता
37. Furniture Showroom - फर्नीचर शोरूम
38. Shoe Shop - जूता दुकान
39. Fabric/Sewing Material Shop - फैब्रिक / सिलाई सामग्री की दुकान
40. Mobile Repair Shop - मोबाइल रिपेयरिंग शॉप
41. Computer/Laptop Sales Shop - कंप्यूटर / लैपटॉप सेल्स शॉप
42. LED Lights Shop - एलईडी लाइट्स शॉप
43. Sound System/DJ Shop - साउंड सिस्टम / डीजे शॉप
44. Gas Stove/Kitchen Appliances Shop - गैस चूल्हा / किचन अप्लायंसेस शॉप
45. CCTV/Security Devices Shop - सीसीटीवी / सिक्योरिटी डिवाइस शॉप
46. Building Material Shop - बिल्डिंग मटेरियल शॉप
47. Tiles and Marble Shop - टाइल्स और मार्बल शॉप
48. Paint and Hardware Shop - पेंट और हार्डवेयर शॉप
49. Motor Parts Shop - मोटर पार्ट्स शॉप
50. Sweets/Snacks House - मिठाई / नमकीन हाउस
51. Wholesale Grocery Store - होलसेल किराना स्टोर
52. Decoration Items Shop - डेकोरेशन आइटम्स शॉप
53. Toy Shop - खिलौने की दुकान
54. Purse/Bag/Belt Shop - पर्स / बैग / बेल्ट की दुकान
55. Cloth Dry Cleaner/Laundry Shop - क्लॉथ ड्राई क्लीनर / लॉन्ड्री शॉप
56. Animal Feed Shop - हेनाफोड / पशु चारा दुकान
57. Cement/Brick/Sand Store - सीमेंट / ईंट / बालू स्टोर
58. Iron/Steel Shop - लोहा / स्टील की दुकान
59. Chinese Fast Food Shop - चायनिज फास्ट फूड शॉप
60. Juice Corner - जूस कॉर्नर
61. Flower Shop - फूलों की दुकान
62. Electrical Fittings Shop - बिजली फिटिंग शॉप
63. Plumbing Supplies Shop - प्लंबिंग सामान की दुकान
64. Opticals/Glasses Shop - ऑप्टिकल्स / चश्मा दुकान
65. Watch Shop/Repairing - घड़ी दुकान / वॉच रिपेयरिंग
66. Religious Items Shop - धार्मिक सामग्री की दुकान
67. Milk Dairy Shop - मिल्क डेरी शॉप
68. Actor - अभिनेता
69. Singer - गायक
70. Painter - चित्रकार
71. YouTuber - यूट्यूबर
72. Photographer - फोटोग्राफर
73. Journalist - पत्रकार
74. Engineer - इंजीनियर
75. Scientist - वैज्ञानिक
76. Data Scientist - डाटा साइंटिस्ट
77. AI Developer - AI डेवलपर
78. Social Worker - समाजसेवी
79. NGO Worker - NGO कार्यकर्ता
80. Priest - पुजारी
81. Saint - संत
82. Spiritual Guru - आध्यात्मिक गुरु
83. Sportsperson - खिलाड़ी
84. Coach - कोच
85. Gym Trainer - जिम ट्रेनर
86. Physiotherapist - फिजियोथेरेपिस्ट
87. Driver - ड्राइवर
88. Pilot - पायलट
89. Sailor - नाविक
90. Delivery Boy - डिलीवरी बॉय
91. Warehouse Staff - वेयरहाउस स्टाफ
92. Soldier - सैनिक
93. Commando - कमांडो
94. Bodyguard - बॉडीगार्ड
95. Cyber Security Expert - साइबर सुरक्षा विशेषज्ञ
96. Mechanic - मिस्त्री
97. Architect - आर्किटेक्ट
98. Builder - बिल्डर
99. Property Agent - प्रॉपर्टी एजेंट
100. Environment Specialist - पर्यावरण विशेषज्ञ
101. Solar Energy Technician - सौर ऊर्जा तकनीशियन
102. Climate Activist - क्लाइमेट एक्टिविस्ट
103. Hotel Manager - होटल मैनेजर
104. Chef - शेफ
105. Waiter - वेटर
106. Air Hostess - एयर होस्टेस
107. Travel Guide - ट्रैवल गाइड
108. Craftsman - कारीगर
109. Weaver - बुनकर
110. Tailor/Embroidery Worker - सिलाई-कढ़ाई वर्कर
111. Dairy Farmer - डेयरी किसान
112. Poultry Farmer - पोल्ट्री किसान
113. Fisherman - मछुआरा
114. Game Developer - गेम डेवलपर
115. Esports Player - ई-स्पोर्ट्स खिलाड़ी
116. Game Commentator - गेम कमेंटेटर
117. Life Coach - लाइफ कोच
118. Therapist - थेरेपिस्ट
119. Counselor - काउंसलर
120. Astronaut - एस्ट्रोनॉट
121. Space Researcher - स्पेस रिसर्चर
122. Housemaid - घरेलू सहायिका
123. Cook - रसोइया
124. Washerman - धोबी
125. Gardener - माली
126. Crypto Trader - क्रिप्टो ट्रेडर
127. NFT Artist - NFT आर्टिस्ट
128. Blockchain Engineer - ब्लॉकचेन इंजीनियर
129. Radio Jockey - रेडियो जॉकी
130. Podcaster - पॉडकास्टर
131. Translator - अनुवादक
132. Astrologer - ज्योतिषी
133. Vastu Consultant - वास्तु सलाहकार
134. Ayurvedic Doctor - वैद्य
135. Tutor - ट्यूटर
136. Graphic Designer - ग्राफिक डिज़ाइनर
137. Web Developer - वेब डेवलपर
138. Mobile App Developer - मोबाइल ऐप डेवलपर
139. Content Writer - कंटेंट राइटर
140. Editor - एडिटर
141. Interior Decorator - इंटीरियर डेकोरेटर
142. Data Entry Operator - डेटा एंट्री ऑपरेटर
143. Event Manager - इवेंट मैनेजर
144. Cameraman - कैमरामैन
145. Audiobook Narrator - ऑडियोबुक रिकॉर्डर
146. Trade Union Leader - ट्रेड यूनियन लीडर
147. Financial Advisor - फाइनेंशियल एडवाइज़र
148. NGO Leader - NGO लीडर
149. Vegetable Market Commission Agent - सब्जी मंडी आड़ती
150. Grain Market / Corn Exchange - अनाज मंडी
151. Public Health - पब्लिक हेल्थ
152. Tubewell Operator - ट्यूबल ऑपरेटर
153. Motorcycle Dealership - मोटरसाइकिल एजेंसी
154. Car Dealership - कार एजेंसी
155. Car Service Station - कार सर्विस स्टेशन
156. Cable Operator - केबल ऑपरेटर
157. Internet Service Provider (ISP) - नेट सर्विस
158. School - स्कूल
159. College - कॉलेज
160. University - यूनिवर्सिटी
161. Car Travel Agency - कार ट्रैवल एजेंसी
162. Bus Travel Agency - बस ट्रैवल एजेंसी
163. Farmer Fertilizer & Seed Shop - किसान खाद बीज दुकान
164. Flour Mill - आटा चक्की
165. Passport Service - पासपोर्ट सर्विस
166. Cricket Team Member - क्रिकेट टीम में
167. Electronics Mall - इलेक्ट्रॉनिक मॉल
168. Reliance Fresh Store - रिलायंस फ्रेश
169. Lawyer - वकील
170. Footwear Shop - जूते चप्पलों की दुकान
171. Readymade Garments Shop - रेडीमेड कपड़ों की दुकान
172. Religious Place - धार्मिक स्थल
173. Dharamshala / Pilgrim Lodge - धर्मशाला
174. Photocopy / Printing Center - फोटो कॉपी / प्रिंटिंग सेंटर
175. Bank Branch - बैंक शाखा
176. Petrol Pump - पेट्रोल पंप
177. ATM Booth - ATM बूथ
178. Municipal Office - नगर निगम कार्यालय
179. Police Station - पुलिस स्टेशन
180. Village Panchayat Office - ग्राम पंचायत कार्यालय
181. Driving School - ड्राइविंग स्कूल
182. Mason - राज मिस्त्री
183. Building Contractor - बिल्डिंग ठेकेदार
184. Inverter Technician - इनवर्टर मिस्त्री
185. Inverter & Solar Technician - इनवर्टर एंड सोलर
186. Tailor Shop - टेलर की दुकान
187. Tailor / Garment Craftsman - दर्जी कपड़े सिलने वाला कारीगर
188. Tuition Teacher - ट्यूशन टीचर
189. Plumber - प्लंबर
190. Welder - वेल्डर
191. Wall Painter - पेण्टर
192. Marble Polisher - मार्बल पोलिश करने वाला
193. AC Mechanic - AC मैकेनिक
194. Washing Machine Repair Technician - वॉशिंग मशीन रिपेयरिंग
195. Sewing Machine Mechanic - सिलाई मशीन मैकेनिक
196. Computer Teacher - कंप्यूटर टीचर
197. Dance Instructor - डांस टीचर
198. Music Teacher - संगीत टीचर
199. Coaching Center Owner - कोचिंग सेंटर संचालक
200. English Liquor Shop - अंग्रेजी शराब की दुकान
201. Country Liquor Shop - देसी शराब की दुकान
202. Combine Scrap - कंबाइन स्क्रैप
203. Car Scrap - कार स्क्रैप
204. Other Scrap Shop - अन्य स्क्रब शॉप
205. Combine Spare Parts - कंबाइन स्पेयर पार्ट
206. Manufacturing Industry - मैन्युफैक्चर इंडस्ट्री
207. Car Accessories - कार एसेसरीज
208. Car Sale & Purchase - कार सेल परचेस
209. Motorcycle Sale & Purchase - मोटरसाइकिल सेल परचेस
210. Motorcycle Seat Making - मोटरसाइकिल सीट बनाना
211. Motorcycle Mechanic - मोटरसाइकिल मिस्त्री
212. Bicycle Repair Shop - साइकिल रिपेयर की दुकान
213. Electrician Spare Parts Shop - इलेक्ट्रीशियन स्पेयर पार्ट शॉप
214. Water Camper Supplier - पानी के कैंपर सप्लायर
215. AC Repair & Tent Service - एसी रिपेयर और टेंट सर्विस
216. Road Construction Contractor - सड़क निर्माण ठेकेदार
217. Road Construction Worker - सड़क निर्माण मजदूर
218. Concrete Centering Contractor - सेंटर डालने वाला ठेकेदार
219. Servo Voltage Stabilizer - सर्वो वोल्टेज स्टेबलाइजर
220. Transformer - ट्रांसफार्मर
221. Solar Panel Manufacturing Company - सोलर पैनल मैन्युफैक्चरिंग कंपनी
222. Plastic Material Shop - प्लास्टिक मैटेरियल शॉप
223. Kitchen Utensils Shop - किचन बर्तनों की दुकान
224. School Uniform Supplier - स्कूल यूनिफॉर्म
225. Government Ration Depot - सरकारी डिपो की दुकान
226. Consumer Support Center - उपभोक्ता सहायता केंद्र
227. All Furniture Shop - ऑल फर्नीचर की दुकान
228. Three Wheeler Service - थ्री व्हीलर सर्विस
229. Vehicle Washing Center - वाशिंग सेंटर
230. Dental Hospital - डेंटल हॉस्पिटल
231. Car Charging Point - कार चार्जर
232. Water Tanker Supplier - पानी के टैंकर सप्लायर
233. Grocery and Provisions Store - पंसारी और किराना स्टोर
234. Combine Spare Parts Shop - कंबाइन के स्पेयर पार्ट की दुकान
235. Combine Harvesting Service Provider - कंबाइन किसान की फसल काटने की सर्विस देने वाला`;

const existingOptions = [
    { en: "Dairy Booth Operator", hi: "डेयरी बूथ ऑपरेटर" },
    { en: "Data Scientist", hi: "डाटा साइंटिस्ट" },
    { en: "Dairy Farmer", hi: "डेयरी किसान" },
    { en: "Data Entry Operator", hi: "डाटा एंट्री ऑपरेटर" },
    { en: "Milk Dairy Shop", hi: "मिल्क डेयरी शॉप" },
    { en: "Grocery Store", hi: "किराना स्टोर" },
    { en: "Chemist", hi: "दवाई की दुकान" },
    { en: "Hardware Store", hi: "हार्डवेयर स्टोर" },
    { en: "Salon", hi: "सैलून" },
    { en: "Restaurant", hi: "रेस्टोरेंट" },
    { en: "Electrician", hi: "इलेक्ट्रीशियन" },
    { en: "Plumber", hi: "प्लम्बर" },
    { en: "Carpenter", hi: "बढ़ई" },
    { en: "Stationery", hi: "स्टेशनरी" },
    { en: "Electronics", hi: "इलेक्ट्रॉनिक्स" },
    { en: "Garments / Clothing", hi: "कपड़े की दुकान" },
    { en: "Footwear", hi: "जूते चप्पल" },
    { en: "Bakery", hi: "बेकरी" },
    { en: "Vegetable & Fruits", hi: "फल और सब्जी" },
    { en: "Automobile Workshop", hi: "ऑटोमोबाइल कार्यशाला" },
    { en: "Furniture", hi: "फर्नीचर" },
    { en: "Jewelry", hi: "आभूषण" },
    { en: "Other", hi: "अन्य" }
];

const map = new Map();
// load existing options first
existingOptions.forEach(opt => {
    map.set(opt.en, { en: opt.en, hi: opt.hi });
});

// parse new options and overwrite existing matching ones
const lines = rawInput.split('\n');
lines.forEach(line => {
    const match = line.match(/^\d+\.\s+([^-]+)\s*-\s*(.+)/);
    if(match) {
        const en = match[1].trim();
        const hi = match[2].trim();
        map.set(en, { en, hi }); // This will overwrite because of Map.set
    }
});

// Create sorted list, but keeping "Other" at the end
const sortedOptions = Array.from(map.values()).sort((a,b) => {
    if(a.en === 'Other') return 1;
    if(b.en === 'Other') return -1;
    return a.en.localeCompare(b.en);
});

let outputCode = 'export const UNIFIED_CATEGORIES = [\n';
sortedOptions.forEach((opt, index) => {
    outputCode += `    { en: ${JSON.stringify(opt.en)}, hi: ${JSON.stringify(opt.hi)} }${index < sortedOptions.length - 1 ? ',' : ''}\n`;
});
outputCode += '];\n';

const typesTs = fs.readFileSync('types.ts', 'utf8');
const regex = /export const UNIFIED_CATEGORIES = \[\s*(?:\{[^}]+\},?\s*)+\];\s*/m;
const newTypesTs = typesTs.replace(regex, outputCode);

fs.writeFileSync('types.ts', newTypesTs);
console.log('done updating types.ts');
