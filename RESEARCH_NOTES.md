# سجل البحث ومصادر TerraNova

تاريخ جمع العينات والمراجعة: **2026-10-15**. القيم أدناه معروضة لتجربة المقارنة فقط؛ نقاط المواقع تقريبية، ولا تمثل حدود مناطق أو شهادة صلاحية لهبوط أو قاعدة.

## أصول العرض ثلاثي الأبعاد

- الأرض: نموذج NASA Solar System glTF [Earth](https://solarsystem.nasa.gov/gltf_embed/2393/).
- القمر: نموذج NASA Solar System glTF [Moon](https://solarsystem.nasa.gov/gltf_embed/2366/).
- المريخ: [NASA/JPL Planet Mars 3D Model](https://science.nasa.gov/resource/planet-mars-3d-model/).
- تُحمّل نسخ glTF المحلية من `client/public/models/` لتجنب الاعتماد على iframe خارجي. النماذج تمثيل مرئي/تعريفي؛ لا تستخدم الهندسة المضغوطة داخلها كـDEM أو كمقياس تضاريس علمي. خامات الخرائط الاحتياطية موثقة في سجل المصادر داخل الموقع.

## الأرض — الارتفاع والمناخ

### ASTER GDEM V003

- المنتج الرسمي: [NASA Earthdata ASTER Global Digital Elevation Model V003](https://www.earthdata.nasa.gov/data/catalog/lpcloud-astgtm-003).
- نقطة الارتفاع مأخوذة من خدمة [OpenTopoData ASTER30m](https://www.opentopodata.org/datasets/aster/) بإعداد أقرب خلية (`interpolation=nearest`). الخدمة تذكر GDEM الإصدار 3؛ posting قوسي واحد (~30 م عند خط الاستواء)، WGS84 أفقيًا وEGM96 رأسيًا، وتغطية إلى نحو 83° شمالًا وجنوبًا. مشاهد المدخلات تمتد من 2000-03 إلى 2013-11.
- ميل نقطة الاستكشاف تقدير فرق مركزي لأربع عينات مجاورة، متباعدة قوسيًا 1″؛ ليس مشتقًا من حدود الموقع ولا تحليلًا لهضبة كاملة. القياسات الجوية / الأرضية تتأثر بدقة الخلية والتضاريس المحلية.

| معرّف الموقع | ارتفاع نقطة العلامة (م) | الميل المحلي التقريبي (°) |
|---|---:|---:|
| Atacama | 2,271 | 15.98 |
| Haughton | 149 | 8.23 |
| McMurdo Dry Valleys | 974 | 14.53 |
| Death Valley | -88 | 3.88 |
| Namib | 722 | 8.56 |
| Reykjanes | 205 | 23.63 |
| Lanzarote | 244 | 4.87 |
| Dhofar | 63 | 7.44 |

### NASA POWER

- التوثيق: [Climatology API](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/)، [Monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/).
- بطاقة الموقع تستدعي خدمة NASA POWER للنقطة المحددة، وتعرض `T2M` (حرارة هواء على ارتفاع 2 م، °C) و`PRECTOTCORR` (متوسط هطول مصحح بوحدة mm/day) وملخص الأشهر. مصدر بيانات ERA المستخدم في عينة التطبيق هو MERRA-2؛ نافذة climatology الظاهرة Jan 2001–Dec 2025.
- هذا reanalysis على شبكة عند إحداثيات علامة تقريبية، لا قراءة محطة أرضية ولا متوسط منطقة. لا يطبّق على القمر أو المريخ.

### NASA Earthdata CMR

- metadata حي من [NASA CMR collections API](https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=SRTMGL1&page_size=1) لمنتج `SRTMGL1` و[`MOD11A1`](https://cmr.earthdata.nasa.gov/search/collections.umm_json?short_name=MOD11A1&page_size=1).
- SRTMGL1 مصدر ارتفاع بنحو 30 م، بتغطية تضاريسية 60°N–56°S؛ MOD11A1 حرارة سطح الأرض اليومية بدقة 1 كم. الموقع يعرض كتالوج هذه المنتجات ولا يدّعي استخراج قيم البكسل منهما لنقاط الأنالوج.

## القمر — LOLA وDiviner

### LOLA Site04

- مرجع المنتج: [NASA Planetary Geodesy and Cartography Working Group — product 78](https://pgda.gsfc.nasa.gov/products/78).
- عينة تضاريس من نافذة مركزية 5×5 كم داخل رستر Site04 ذي 5 م/بكسل؛ 1,000,000 خلية في نافذة العينة. الارتفاع نسبةً إلى كرة مرجعية نصف قطرها 1,737,400 م؛ **90% من بكسلات هذه العينة مستوفاة/interpolated** في منتج السطح المحدد.
- الارتفاعات P10/median/P90: **-404.329 / 829.882 / 1,658.938 م**؛ الميل P10/median/P90: **12.79 / 30.484 / 34.974°**. يورد NASA خطأ RMS وسيطًا 0.30–0.50 م للارتفاع و1.5–2.5° للميل؛ نسبة الاستيفاء تجعل هذه الإحصاءات غير مناسبة لتقييم خطر ميداني دقيق.

### LRO Diviner

- الأرشيف: [NASA PDS Diviner data](https://pds-geosciences.wustl.edu/missions/lro/diviner.htm). ملف العينة هو `PCP_AVG_TBOL_POLS_LS330_SLON15_240`، والقياس هو `Tbol` (سطوع حراري بولومتري) بالكلفن؛ سجل PDS يحدد فترة الرصد 2009-07-05 إلى 2020-03-15.
- جُمعت **345** قيمة صحيحة ضمن 2.5 كم من النقطة **89.7683°S, 172.1467°W** في شبكة **240 م** للمنتج `LS330/SLON15` (فترة الرصد 2009-07-05 إلى 2020-03-15 كما في ملصق PDS). P10/median/P90: **62.76 / 85.66 / 148.57 K**، والنطاق المرصود **60.17–251.51 K**، وأوقات القياس المحلية في العينة **8.665–11.396 ساعة**.
- قياس Diviner هو انبعاث/سطوع حراري لسطح القمر، وليس حرارة هواء. هذه الفئة الموسمية المحددة ليست متوسط مناخ سنوي ولا يمكن مقارنتها مباشرة بمتوسط T2M الأرضي.

## المريخ — MOLA وطقس Perseverance

### MOLA

- أرشيف المنتج: [NASA PDS Geosciences — MGS MOLA MEGDR](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html).
- الشبكة `MEGT90N000EB` هي Signed MSB2 بحجم 2,880×5,760، ودقتها 16 بكسل/درجة؛ مرجع الارتفاع Goddard Mars areoid. بعد تصحيح محور الطول المركزي 180° من ملصق PDS، خلية Jezero القريبة من موقع هبوط Perseverance هي **-2,609 م**، والميل المشتق مركزيًا من 3×3 خلايا **0.671°**. حجم الخلية يقارب 3.704 كم شمال-جنوب و3.514 كم شرق-غرب عند خط عرض Jezero.
- هذه طبوغرافيا إقليمية خشنة بمقياس كيلومترات، لا خريطة منحدرات/عوائق على مقياس مركبة أو موقع هبوط.

### Mars 2020 / MEDA

- [NASA Mars 2020 weather feed](https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json).
- آخر سجل كامل متاح عند جمع البيانات: **2024-04-27، Sol 1133**؛ Tmin **-79.3°C** وTmax **-24.7°C** وضغط **778.9 Pa**. التطبيق يحاول الاستعلام عن أحدث سجل عند فتح المقارنة، ويعود إلى هذا السجل الموسوم *last-known* إذا لم يتوفر مصدر أحدث.
- هذا تقرير يومي واحد من موقع المركبة، وليس climatology طويلة الأجل. اختلاف الموسم والارتفاع والموقع وظروف القياس يمنع اعتباره متوسطًا عامًا لسطح المريخ.

## الدراسة والمواد التي قدمها المستخدم

- دراسة تمت مراجعتها في Google Scholar ثم فُتحت صفحة النشر الأصلية: Osinski, G.R., Léveillé, R., Berinstain, A., Lebeuf, M. & Bamsey, M. (2006), [Terrestrial Analogues to Mars and the Moon: Canada's Role](https://www.erudit.org/en/journals/geocan/2006-v33-n4-geocan_33_4/geocan33_4art01/), *Geoscience Canada*, 33(4), 175–188.
- سجل ناسا للمواقع التناظرية: [NASA Planetary Analog Explorer](https://science.nasa.gov/solar-system/analog-explorer/).
- تمت مراجعة مشاركة Gemini التي أرسلها المستخدم. اقتراحها لبناء مؤشر (ASI) بأوزان تجمع الميل والحرارة والخواص الطيفية والخشونة مفيد كتصور بحثي، لكن لم يُعتمد كناتج في التطبيق لأن الأوزان والتطبيع والدقة والجودة لم تكن محددة بما يكفي لإنتاج مؤشر موثوق. كذلك لا تُعامل اقتراحات مواقع المشاركة كحقائق ميدانية دون مصادر مستقلة.

## سياسة العرض والمنهجية

- نموذج NASA glTF لا يُستخدم كطبقة قياس؛ كل قيمة طبوغرافية/مناخية تحمل مصدرًا ووحدةً ومقياسًا وفترةً أو مرجعًا رأسيًا متاحًا.
- النافذة تقارن قياسات وصفية جنبًا إلى جنب، ولا تنتج نسبة تطابق كوكبية. تختلف منتجات Earth وMoon وMars في نظام الإسناد، دقة الخلية، الموسم، أجهزة القياس، ومقدار الاستيفاء.
- إحداثيات العلامات الأرضية تقريبية. لا تُستنتج صلاحية قاعدة أو موقع هبوط من نقطة واحدة، ولا من درجات الواجهة الخمس التوضيحية.


## إضافة بحث وتدقيق — 2026-10-17

### خريطة الأرض وطبقاتها
- توثيق MapLibre GL JS الرسمي يشرح إسقاط `globe` والتفاعل بالسحب والتقريب: [Display a globe](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/) و[Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/).
- دليل OpenFreeMap الرسمي: [Quick start](https://openfreemap.org/quick_start/). Style `https://tiles.openfreemap.org/styles/liberty` يستخدم مصدر OpenMapTiles vector؛ مراجعة ملف الستايل الحي بتاريخ 2026-10-17 أظهرت طبقات `place/state/country labels` إضافة إلى مصدر Natural Earth shaded relief. يجب إظهار إسناد OpenStreetMap/OpenFreeMap الملائم.
- خدمة ArcGIS World Imagery الحية تعلن `Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community` وتدعم tiles حتى level 23 وفق بيان MapServer: [World Imagery MapServer](https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer?f=pjson). شروط الاستخدام: [Esri Web Site/Service Terms](https://www.esri.com/en-us/legal/terms/web-site-service). طبقة اختيارية بإسناد مرئي؛ لا تُنسخ imagery إلى المستودع.

### Geocoding وملف المواقع
- سياسة Nominatim العامة تفرض User-Agent/Referer مميزًا وحدًا أقصى **طلب واحد/ثانية**، وإسناد OSM، وتمنع auto-complete والاستخدام كخدمة بحث عامة مدمجة في تطبيق low/no-code. العمل مرة واحدة على كتالوج صغير يحترم قواعد single-thread والتخزين المؤقت ممكن، على أن تحفظ كل النتائج ولا يطلب الموقع geocoding متكررًا: [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/). لا تستخدم TerraNova Nominatim runtime للبحث أو AI Scout.
- تدقيق `NewMicrosoftExcelWorksheet.xlsx`: 44 صف بيانات و12 عمودًا؛ أسماء بالعربية والإنجليزية، منطقة/قياسات/صفات، هدف قمري أو مريخي، تصنيف جيولوجي، تطبيقات مهمة، وحقلان إضافيان فارغان. سجلات عديدة تجمّع أكثر من موقع، وبعضها يضع إحداثيات داخل الوصف بدل خانة مستقلة. لم تظهر روابط مصادر مستقلة على الصفوف؛ لذلك تحفظ كاقتراحات من ملف المستخدم/Gemini بحالة `unverified` لا كحقائق NASA أو مواقع مؤكدة الجِدّة.
- استعلام `manus-config config load` و`connector search NASA` لم يظهر موصل NASA؛ واجهات NASA المذكورة عامة بلا مصادقة، لذا تتصل بها المنصة مباشرة مع الإسناد بدل إدخال اعتماد أو connector غير لازم.

### أسماء معالم Moon/Mars وأخذ عينات الارتفاع
- صفحة USGS الرسمية [KML and Shapefile Downloads](https://planetarynames.wr.usgs.gov/GIS_Downloads) تنشر ملفات مراكز المعالم المسماة والمعتمدة وتُحدّثها كل ليلة. إحداثيات KML تستخدم شرقًا لخط الطول وplanetocentric latitude؛ ملف القمر مبني على شبكة LOLA 2011، ومرجع المريخ MDIM 2.1. التسمية/الموقع بحسب [USGS/IAU Gazetteer](https://planetarynames.wr.usgs.gov/). تُعرض المراكز لا الحدود: Shackleton (-89.67°, 129.78°E)، Mare Tranquillitatis (8.3487°, 30.8346°E)، Tycho (-43.2958°, -11.2153° signed-east); Jezero (18.4082°, 77.6873°E)، Gale (-5.3672°, 137.811°E)، Olympus Mons (18.6528°, -133.8025° signed-east)، Elysium Planitia (2.979°,154.7372°E)، وValles Marineris (-14.0059°,-58.5877° signed-east). لا يُخلط خط الطول signed مع longitude 0–360.
- OpenTopoData API: [API documentation](https://www.opentopodata.org/api/) تقبل مواقع متعددة في `locations=lat,lon|lat,lon` و`interpolation=nearest`, وتتوقع WGS84/EPSG:4326 وتُرجع عينة ارتفاع ومجموعة البيانات لكل نقطة. هذا يسمح بحساب ميل تقريبي بأربع نقاط حول العلامة، مع بقاء ASTER 30 m/nearest-neighbour مجرد عينة لا خريطة صلاحية.

## نتائج تحقق إحداثيات إضافية — 2026-10-18
- **Kamil Crater, Egypt:** الإحداثيات المنشورة 22°01′06″N, 26°05′15″E؛ decimal degrees: `22.0183333333, 26.0875`. المصدر دراسة محكّمة تذكر النقطة للفوهة نفسها: [Geological and geophysical investigation of Kamil crater](https://onlinelibrary.wiley.com/doi/full/10.1111/maps.12023).
- **Jingpohu Volcanic Field, China:** `44.08°N, 128.83°E` كما في Smithsonian Global Volcanism Program؛ لم يحدد السجل datum: [Smithsonian GVP · Jingpohu](https://volcano.si.edu/volcano.cfm?vn=305040).
- **Undara Lava Tube System, Australia:** `18.2007°S, 144.6588°E` منشورة لبركان Undara المستخدم نقطة تمثيلية للنظام، لا centroid للأنابيب الممتدة: [Undara lava tubes · StoryMap](https://storymaps.arcgis.com/stories/28aac0f24fe44eadb52f45d9509a31f9).
- **Fiskenaesset Anorthosite Complex:** تُركت الإحداثيات غير محددة؛ المصدر يصف مركبًا جيولوجيًا واسعًا في جنوب غرب غرينلاند دون نقطة WGS84 موثقة: [GEUS Bulletin](https://geusbulletin.org/index.php/geusb/article/view/4980).
- **La Corona Lava Tube / Jameo Agujerado:** تُركت الإحداثيات غير محددة؛ المصدر العلمي يرسم النظام لكنه لا يذكر نقطة WGS84 مؤكدة للمكوّن المحدد: [Inception and Evolution of La Corona Lava Tube System](https://agupubs.onlinelibrary.wiley.com/doi/full/10.1029/2022JB024056).
- بقيت السجلات الأخرى بلا إحداثيات عندما لم يوردها الملف ولم يتوفر مصدر نقطة تمثيلية موثوقة. تعرض الواجهة provenance وحالة الإحداثيات لكل سجل ولا تفترض أن كل صف موقع جديد أو أن له حدودًا معلومة.
- محاولة geocoding لمرة واحدة من Nominatim أُجريت بطلب متسلسل كل 1.15 ثانية وUser-Agent يعرّف TerraNova. لم تنتج الأسماء العشرة إلا نتيجتين قابلتين للتعرّف: Dyngjusandur (OSM relation 13737263) وLago Specchio di Venere / Bagno dell’Acqua (OSM way 28736558). استخدمتا كنقطتين تمثيليتين فقط؛ فشل/عدم وجود نتيجة بقي unresolved بدل الاستعاضة بإحداثيات مدينة أو منطقة عريضة. بيانات OSM © OpenStreetMap contributors: https://www.openstreetmap.org/copyright.

## TerraNova implementation addendum — 2026-10-18
- دُمجت صفوف Excel الـ44 مع حقول provenance؛ الإحداثيات المنشورة لبعض الصفوف نُسبت إلى مصادرها. صفوف المواقع المركبة أو الإقليمية لم تُسقط على مركز مختلق.
- بيانات الخريطة: MapLibre GL JS globe فوق OpenFreeMap Liberty style (تسميات OpenStreetMap/OpenMapTiles)؛ imagery اختيارية من Esri World Imagery بإسناد ظاهر. صور القمر الصناعي ليست قياسًا علميًا.
- طبقات GIS: parsing محلي في المتصفح؛ GeoJSON/JSON وCSV points وKML وShapefile ZIP؛ حد الملف 25 MiB و20,000 feature و500,000 coordinate vertices. تحليل ASTER اختياري على نقطة تمثيلية أولى فقط، ويُعرض كمقياس نقطة لا كتحليل كامل لمضلع/طبقة.
- AI Scout يستدعي Manus built-in LLM server-side فقط؛ تُلحق metadata التي رجعت فعلًا من NASA CMR. النظام يفرض `null` لإحداثيات AI، ويتعامل مع النتائج كفرضيات. لا تستخدم قاعدة البيانات ولا تُرسل هندسة GIS إلى النموذج.
- خوارزمية terrain-only بوزن الميل 0.60 والمدى الرأسي 0.40 عند توافق نافذة القياس؛ يُطبّع الوزن المتاح ويُعرض `coverage` مستقلًا. لا يُضمّن الطقس أو الجيولوجيا أو صلاحية الهبوط.

## Final integration check — 2026-10-19
- `listLLMModels()` على Manus endpoint الحي أظهر `gpt-5-mini`; يستخدم AI Scout `response_format` بنمط JSON Schema وGPT-family `max_completion_tokens`. إذا لم يوجد محتوى في الاستجابة المنظمة، يجري استدعاء واحد بديل بلا `response_format` ثم تُحلل النتيجة وتُتحقق. لم يُنفذ generation call حي أثناء فحص البناء.
- مراجعة السجل الموحّد: 44 صفًا، 25 لها نقطة تمثيلية/مصدرية معلّمة، و19 بقيت unlocated. سجلات المواقع المركبة والمناطق الواسعة لا تحصل على centroids مخمّنة.
- إعداد Manus النهائي: Server مفعّل بموافقة المستخدم وDatabase معطّل. static build إلى `dist/public`; المسار `/api/*` للخادم وباقي الصفحات إلى static SPA. Health route هو `/api/health`.
- فحص Preview عبر HTTP أعاد 200 للمسارات `/`, `/api/health`, و`/manus-routes.json`.
