// Strings for the Copilot, Shield, post kit and demo tools. Loaded after i18n.js.
Object.assign(I18N.en, {
  copilot: 'Cendoor Copilot', copilotSub: 'Decisions from your own order history',
  ins_soldOut: i => `${i.product} is sold out and was selling about ${i.perWeek} a week. Restock around ${i.reorder}.`,
  ins_runway: i => `${i.product} will sell out in about ${i.days} day(s) (${i.stock} left). Reorder around ${i.reorder}.`,
  ins_carrierGap: i => `${i.best} delivers ${i.bestRate}% of your parcels, ${i.worst} only ${i.worstRate}%. Consider switching your default carrier.`,
  ins_carrierCity: i => `In ${i.city}, ${i.best} delivers ${i.bestRate}% but ${i.worst} only ${i.worstRate}%. Cendoor can pick the best one for you.`,
  ins_bestPost: i => `Your best post: "${i.label}" converts ${i.conv}% of visits into orders (${Math.round(i.revenue).toLocaleString('en-GB')} MAD). Make more like it.`,
  ins_winback: i => `${i.n} customer(s) have not ordered for 60+ days (average spend ${i.avg} MAD). Send them a message.`,
  ins_failRate: i => `${i.pct}% of your deliveries failed in the last 30 days. Check risky orders before shipping.`,
  valueTitle: 'What Cendoor did for you this month', valueHours: 'Estimated time saved', valueRecovered: 'Failed deliveries recovered', valueHeld: 'Risky orders held for approval', valueChat: 'Orders created from chat',
  valueNote: 'Time saved is an estimate (about 6 minutes per order). Recovered and held amounts come from your own orders.', orders1: 'orders',
  r_network_failed: 'Cendoor Shield: other sellers had failed deliveries with this number', r_network_good: 'Cendoor Shield: other sellers delivered to this number successfully',
  bestCarrier: 'Best carrier here', sinceN: n => `${n} deliveries`, askWhatsApp: 'Confirm on WhatsApp',
  postKit: 'Post kit', postKitHint: 'A caption and a tracked link, ready to paste into Instagram, TikTok or a WhatsApp status.', generate: 'Generate', copyCaption: 'Copy caption',
  autoCarrier: 'Choose the best carrier automatically for each city', autoCarrierHint: 'Based on how each carrier really performed on your orders (needs a few completed deliveries per city).', carrierPerf: 'Carrier performance (your orders)',
  demoTools: 'Investor demo', demoHint2: 'Put the demo shop back to its original data. Anything investors created is removed.', resetDemo: 'Reset demo data', resetDone: 'Demo reset',
  trackTitle: 'Track your order', shield: 'Cendoor Shield',
});
Object.assign(I18N.fr, {
  copilot: 'Cendoor Copilot', copilotSub: 'Des décisions tirées de votre propre historique',
  ins_soldOut: i => `${i.product} est épuisé et se vendait environ ${i.perWeek} par semaine. Réapprovisionnez environ ${i.reorder}.`,
  ins_runway: i => `${i.product} sera épuisé dans environ ${i.days} jour(s) (${i.stock} restants). Recommandez environ ${i.reorder}.`,
  ins_carrierGap: i => `${i.best} livre ${i.bestRate}% de vos colis, ${i.worst} seulement ${i.worstRate}%. Pensez à changer de transporteur par défaut.`,
  ins_carrierCity: i => `À ${i.city}, ${i.best} livre ${i.bestRate}% mais ${i.worst} seulement ${i.worstRate}%. Cendoor peut choisir le meilleur pour vous.`,
  ins_bestPost: i => `Votre meilleur post : « ${i.label} » transforme ${i.conv}% des visites en commandes (${Math.round(i.revenue).toLocaleString('fr-FR')} MAD). Faites-en d'autres comme lui.`,
  ins_winback: i => `${i.n} client(s) n'ont pas commandé depuis 60+ jours (dépense moyenne ${i.avg} MAD). Envoyez-leur un message.`,
  ins_failRate: i => `${i.pct}% de vos livraisons ont échoué ces 30 derniers jours. Vérifiez les commandes risquées avant d'expédier.`,
  valueTitle: 'Ce que Cendoor a fait pour vous ce mois-ci', valueHours: 'Temps gagné estimé', valueRecovered: 'Livraisons échouées récupérées', valueHeld: 'Commandes risquées retenues pour validation', valueChat: 'Commandes créées par le chat',
  valueNote: "Le temps gagné est une estimation (environ 6 minutes par commande). Les montants récupérés et retenus viennent de vos propres commandes.", orders1: 'commandes',
  r_network_failed: "Cendoor Shield : d'autres vendeurs ont eu des livraisons échouées avec ce numéro", r_network_good: 'Cendoor Shield : d\'autres vendeurs ont livré ce numéro avec succès',
  bestCarrier: 'Meilleur transporteur ici', sinceN: n => `${n} livraisons`, askWhatsApp: 'Confirmer sur WhatsApp',
  postKit: 'Kit de publication', postKitHint: 'Une légende et un lien suivi, prêts à coller dans Instagram, TikTok ou un statut WhatsApp.', generate: 'Générer', copyCaption: 'Copier la légende',
  autoCarrier: 'Choisir automatiquement le meilleur transporteur pour chaque ville', autoCarrierHint: 'Basé sur les performances réelles de chaque transporteur sur vos commandes (quelques livraisons terminées par ville nécessaires).', carrierPerf: 'Performance des transporteurs (vos commandes)',
  demoTools: 'Démo investisseur', demoHint2: "Remet la boutique de démo à ses données d'origine. Tout ce que les investisseurs ont créé est supprimé.", resetDemo: 'Réinitialiser la démo', resetDone: 'Démo réinitialisée',
  trackTitle: 'Suivre votre commande', shield: 'Cendoor Shield',
});
Object.assign(I18N.ar, {
  copilot: 'مساعد سندوور', copilotSub: 'قرارات مستخرجة من تاريخ طلباتك',
  ins_soldOut: i => `${i.product} نفد وكان يُباع حوالي ${i.perWeek} في الأسبوع. أعد التموين بحوالي ${i.reorder}.`,
  ins_runway: i => `${i.product} سينفد خلال حوالي ${i.days} يوم (متبقي ${i.stock}). أعد الطلب بحوالي ${i.reorder}.`,
  ins_carrierGap: i => `${i.best} يسلّم ${i.bestRate}% من طرودك، و${i.worst} ${i.worstRate}% فقط. فكّر في تغيير الناقل الافتراضي.`,
  ins_carrierCity: i => `في ${i.city}، ${i.best} يسلّم ${i.bestRate}% بينما ${i.worst} ${i.worstRate}% فقط. يمكن لسندوور اختيار الأفضل تلقائيا.`,
  ins_bestPost: i => `أفضل منشور لديك: «${i.label}» يحوّل ${i.conv}% من الزيارات إلى طلبات (${Math.round(i.revenue).toLocaleString('en-GB')} درهم). انشر المزيد مثله.`,
  ins_winback: i => `${i.n} زبناء لم يطلبوا منذ أكثر من 60 يوما (متوسط الإنفاق ${i.avg} درهم). أرسل لهم رسالة.`,
  ins_failRate: i => `${i.pct}% من توصيلاتك فشلت خلال آخر 30 يوما. راجع الطلبات المحفوفة بالمخاطر قبل الشحن.`,
  valueTitle: 'ما فعلته سندوور لك هذا الشهر', valueHours: 'الوقت الموفَّر (تقدير)', valueRecovered: 'توصيلات فاشلة تم استرجاعها', valueHeld: 'طلبات محفوفة بالمخاطر بانتظار الموافقة', valueChat: 'طلبات أُنشئت من المحادثة',
  valueNote: 'الوقت الموفَّر تقدير (حوالي 6 دقائق لكل طلب). المبالغ المسترجعة والمحجوزة من طلباتك الفعلية.', orders1: 'طلبات',
  r_network_failed: 'درع سندوور: بائعون آخرون واجهوا توصيلات فاشلة مع هذا الرقم', r_network_good: 'درع سندوور: بائعون آخرون سلّموا لهذا الرقم بنجاح',
  bestCarrier: 'أفضل ناقل هنا', sinceN: n => `${n} توصيلات`, askWhatsApp: 'تأكيد عبر واتساب',
  postKit: 'حزمة النشر', postKitHint: 'تعليق ورابط متتبَّع جاهزان للصق في إنستغرام أو تيك توك أو حالة واتساب.', generate: 'إنشاء', copyCaption: 'نسخ التعليق',
  autoCarrier: 'اختيار أفضل ناقل تلقائيا لكل مدينة', autoCarrierHint: 'حسب الأداء الفعلي لكل ناقل على طلباتك (يلزم بعض التوصيلات المكتملة في كل مدينة).', carrierPerf: 'أداء الناقلين (طلباتك)',
  demoTools: 'عرض المستثمرين', demoHint2: 'يعيد متجر العرض إلى بياناته الأصلية. كل ما أنشأه المستثمرون يُحذف.', resetDemo: 'إعادة ضبط العرض', resetDone: 'تمت إعادة الضبط',
  trackTitle: 'تتبّع طلبك', shield: 'درع سندوور',
});

Object.assign(I18N.en, { askTitle: 'What do you want to do?', askPlaceholder: 'Tell Cendoor in your own words…', askBtn: 'Ask', askChip1: 'Build my shop', askChip2: 'Make it elegant, gold and black', askChip3: 'Add my Instagram', trialLeft: n => `Free trial: ${n} day(s) left`, trialThen: 'then 149 MAD a month, cancel any time', choosePlan: 'Choose a plan' });
Object.assign(I18N.fr, { askTitle: 'Que voulez-vous faire ?', askPlaceholder: 'Dites-le à Cendoor avec vos mots…', askBtn: 'Demander', askChip1: 'Construis ma boutique', askChip2: 'Style élégant, or et noir', askChip3: 'Ajoute mon Instagram', trialLeft: n => `Essai gratuit : ${n} jour(s) restant(s)`, trialThen: 'puis 149 MAD par mois, sans engagement', choosePlan: 'Choisir une offre' });
Object.assign(I18N.ar, { askTitle: 'ماذا تريد أن تفعل؟', askPlaceholder: 'قل لسندوور بكلامك…', askBtn: 'اسأل', askChip1: 'ابني متجري', askChip2: 'خليه أنيق بالذهبي والأسود', askChip3: 'زيد الإنستغرام ديالي', trialLeft: n => `تجربة مجانية: بقي ${n} يوم`, trialThen: 'ثم 149 درهم شهريا، يمكنك الإلغاء في أي وقت', choosePlan: 'اختر باقة' });

Object.assign(I18N.en, { slogan: 'You post. Cendoor does the rest.' });
Object.assign(I18N.fr, { slogan: 'Vous postez. Cendoor fait le reste.' });
Object.assign(I18N.ar, { slogan: 'أنت تنشر، وسندوور تتكفل بالباقي.' });

Object.assign(I18N.en, { confirmAgent: 'AI asks customers to confirm form orders', confirmAgentHint: 'Orders placed with the quick form wait until the customer replies YES to the AI message (WhatsApp). Until WhatsApp is connected, use the one-tap "Confirm on WhatsApp" button in the order.' });
Object.assign(I18N.fr, { confirmAgent: "L'IA demande aux clients de confirmer les commandes du formulaire", confirmAgentHint: "Les commandes passées avec le formulaire rapide attendent que le client réponde OUI au message de l'IA (WhatsApp). Tant que WhatsApp n'est pas connecté, utilisez le bouton « Confirmer sur WhatsApp » dans la commande." });
Object.assign(I18N.ar, { confirmAgent: 'الذكاء الاصطناعي يطلب من الزبناء تأكيد طلبات الاستمارة', confirmAgentHint: 'الطلبات المسجلة بالاستمارة السريعة تنتظر حتى يجيب الزبون بنعم على رسالة الذكاء الاصطناعي (واتساب). إلى أن يُربط واتساب، استعمل زر «تأكيد عبر واتساب» داخل الطلب.' });
