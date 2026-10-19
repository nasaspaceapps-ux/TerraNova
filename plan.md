# TerraNova — خطة التنفيذ

## الهدف والنطاق

استكمال تطبيق TerraNova لتحدي NASA Space Apps Challenge بعنوان “Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars”. تبقى وظائف المشروع القائمة أساسًا: نماذج NASA glTF المحلية، NASA CMR وPOWER، عينات ASTER/LOLA/MOLA، ومقارنة Earth–Moon–Mars. المطلوب الآن خريطة Earth تفاعلية، كتالوج سجلات Excel وعددها 44، أسماء معالم IAU للقمر والمريخ، AI Scout، Analog Match Score محسوبة، واستيراد GIS.

## قرارات التنفيذ

- **Earth map:** MapLibre GL JS بإسقاط Globe مع OpenFreeMap vector style لإظهار حدود الدول وتسميات الدول والمدن، وأدوات تدوير/تقريب. طبقة Esri World Imagery اختيارية، ويظهر إسناد Esri وOpenStreetMap/OpenFreeMap. العلامات وطبقات GeoJSON تتعامل مع الإحداثيات الجغرافية.
- **Moon/Mars:** الإبقاء على NASA glTF الحاليين ومشهد Three.js القابل للدوران. عرض مجموعة من مراكز المعالم المسماة من USGS/IAU Gazetteer، مع الاسم والمنطقة والإحداثيات ومصدر التسمية. النموذج المرئي ليس DEM.
- **كتالوج Excel:** إدخال الصفوف الـ44 مع الاسم العربي والإنجليزي والمنطقة والصفات والهدف الكوكبي والحقول الخام والمصدر. إحداثيات الصفوف التي لم يوردها الملف لا تُخمن. إذا كان السجل يضم عدة مواقع، تبقى إحداثياته فارغة ما لم يُعثر على نقطة تمثيلية منشورة؛ أي centroid تقريبي يُوسم. كل الاقتراحات تظل `unverified` إلى أن تُتحقق منفصلًا، ولا توصف جميعها بأنها جديدة علميًا.
- **AI Scout:** فعّل المستخدم قدرة Server فقط؛ تبقى Database معطّلة. تُستخدم Manus Built-in LLM من الخادم عبر tRPC وبـJSON schema وتحقيق مدخلات وحدود معدل. ترجع الميزة فرضيات مرشحة لا حقائق، وتفصل بين النتائج الجغرافية المقترحة وNASA CMR metadata التي جُلبت فعليًا. لا تُرسل ملفات GIS إلى LLM.
- **Analog Match Score:** حساب فحص تضاريسي أولي، لا صلاحية هبوط أو تطابق شامل. عند اختيار Moon، تُسحب 9 نقاط مركزية من ASTER داخل نافذة 5×5 كم حول الموقع الأرضي؛ وعند Mars تُستخدم نافذة تقارب 11×11 كم بما يقابل 3×3 خلايا MOLA قرب Jezero. من كل نقطة يُقدَّر الميل بأربع جيران قريبة، وتُقارن median الميل الأرضي بمرجع LOLA/MOLA. عامل المدى الرأسي `P90−P10` يضاف فقط إذا توافرت بيانات نافذة متقاربة؛ وزنه 0.40، ووزن الميل 0.60. لكل عامل: `similarity = max(0, 100 × (1 − |Δ| / tolerance))` للميل مع `tolerance = 20°`؛ والمدى الرأسي يستخدم `max(0, 100 × (1 − |ln((R_E+1)/(R_P+1))| / ln(4)))`. تُطبّع الأوزان على العوامل المتاحة، ويُعرض `coverage` منفصلًا. كثافة ASTER (9 عينات) ودقة LOLA/MOLA/اختلافها تظهر كقيود ملازمة للدرجة.
- **GIS import:** معالجة محلية في المتصفح لملفات GeoJSON، CSV بإحداثيات lat/lon، KML، وShapefile ZIP؛ تحويلها إلى GeoJSON، وعرض الطبقات وإظهارها/إخفاؤها/حذفها. تلخيص عدد العناصر وأنواعها والمدى الجغرافي، مع أخذ عينة NASA عند centroid Earth المعلن بوضوح، لا ادعاء تحليل كل مضلع. يدعم WGS84 للإرض، ودرجات كوكبية east-positive للطبقات على Moon/Mars؛ لا يُرفع الملف ولا يُرسل للـAI افتراضيًا.
- **المصادر:** إبقاء روابط NASA/PDS الحالية، وإظهار إسناد المصادر المستخدمة لكل طبقة. قياسات NASA منفصلة عن نصوص Gemini وعن هندسة glTF.

## بنية المشروع

- `client/src/pages/Home.tsx`: تنسيق لوحة البحث، اختيار الجرم، الفلاتر، السجل المحدد، شريط GIS وAI، وفتح المقارنة والمصادر.
- `client/src/components/EarthGlobeMap.tsx`: MapLibre globe، أسماء الأماكن، Esri imagery، مواقع Earth وطبقات GIS.
- `client/src/components/PlanetGlobe.tsx`: نماذج NASA glTF وعلامات المعالم القمرية/المريخية.
- `client/src/components/AIScout.tsx` و`GISImport.tsx`: واجهات البحث الذكي واستيراد وتحليل الملفات.
- `client/src/data/sites.ts` و`geminiCandidates.raw.json`: بيانات المرجع والصفوف الأصلية للـExcel مع provenance وحالة الإحداثيات.
- `client/src/data/analogScore.ts` و`earthTerrain.ts` و`planetaryFeatures.ts`: score، أخذ عينات ASTER، ومراكز USGS/IAU.
- `client/src/components/MissionComparator.tsx`: عرض عوامل التطابق والقياسات الجانبية والقيود.
- `server/routers.ts` و`server/routers/terraNova.ts`: إجراء AI Scout بلا تخزين دائم أو قاعدة بيانات.
- `client/public/manus-routes.json`: المسار `/` فقط وفق `client/src/App.tsx`.

## التصميم

- **Design Movement:** Field Operations / لوحة عمليات علمية؛ تطوير الهوية الداكنة الموجودة بدل استبدالها.
- **Core Principles:** المقروئية أولًا؛ المصدر والوحدة والثقة ملازمة لكل قيمة؛ تفاعل عملي؛ فرضيات AI لا تُعرض كحقائق.
- **Color Philosophy:** فحمي/صخري للوحة، lime mineral للإجراء والتحديد، تركواز للمراجع، وألوان قمريّة/مريخية لمؤشرات الجرم فقط.
- **Layout Paradigm:** خريطة واسعة كمساحة عمل، وDiscovery Console جانبية؛ التفاصيل في لوحات مضغوطة لا شبكات بطاقات مزدحمة.
- **Signature Elements:** مؤشر اتجاه/مدار؛ شريط إحداثيات ومصدر؛ أوسمة `MEASURED / APPROXIMATE / UNVERIFIED`.
- **Interaction Philosophy:** السحب يدير الكرة، wheel/touch للتقريب، اختيار العلامة يفتح سجلها، وكل import أو AI lead قابل للإزالة؛ لا رفع تلقائي لهندسة المستخدم.
- **Animation:** انتقالات 160–240ms؛ حركة الكرة هادئة وقابلة للإيقاف؛ لا تحريك تلقائي للنتائج.
- **Typography System:** `Space Grotesk` للعناوين و`DM Sans` للنص و`DM Mono` للإحداثيات، مع `Noto Sans Arabic` للنص العربي.
- **Brand Essence:** TerraNova يحوّل بيانات الكواكب المفتوحة إلى سجل استكشاف أرضي قابل للفحص؛ عملي، موثّق، فضولي.
- **Brand Voice:** لغة مباشرة ثنائية. مثال: “Find the field analogue / اكتشف الموقع النظير” و“Evidence first — النتائج فرضيات حتى تُقاس”.
- **Wordmark & Logo:** TerraNova بجوار حلقة مدار/فوهة غير مكتملة وبوصلة صغيرة، دون استخدام شعار NASA الرسمي.
- **Signature Brand Color:** lime mineral `#D3EF70`.

## التشغيل والنشر

React/TypeScript/Vite لواجهة المستخدم، وExpress/tRPC الموجود في القالب لخدمة AI؛ قدرة Server مفعّلة بموافقة المستخدم وتظل Database معطّلة. تستدعي الواجهة AI من الخادم فقط. يُبنى frontend إلى `dist/public` وتُوجّه `/api/*` للخادم و`/*` للواجهة الثابتة، مع احترام `PORT=3000` افتراضيًا و`/api/health`. لا أسرار داخل bundle أو ملفات العميل.