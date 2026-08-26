#!/usr/bin/env node
// Adds assets section + nav/dashboard keys to all non-English locales.
// Run: node scripts/add-i18n-assets.mjs
import { readFileSync, writeFileSync } from 'fs';

const file = 'src/i18n/messages.ts';
let src = readFileSync(file, 'utf8');

// Translations for each locale
const translations = {
  zh: {
    nav: { assets: '素材库', dashboard: '仪表盘', products: '产品', avatars: '数字人', brandKits: '品牌套件' },
    assets: {
      title: '素材库', subtitle: '可复用的产品、数字人和品牌套件 — 保存一次，所有工作流通用。',
      tabProducts: '产品', tabAvatars: '数字人', tabBrandKits: '品牌套件', signInPrompt: '登录以管理你的素材。',
      productsEmpty: '还没有产品。添加一个产品，在广告生成中复用。', productsEmptyHint: '产品存储参考图和简短描述，让 AI 保持产品一致性。',
      addProduct: '添加产品', editProduct: '编辑产品', productName: '产品名称', productNamePh: '例如 Glow Serum',
      productDesc: '产品描述（英文效果最佳）', productDescPh: '简短的英文描述，确保产品在各镜头中一致…',
      productImage: '产品图片', productSourceUrl: '来源链接（可选）', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: '还没有数字人。添加一个主持人肖像来复用。', avatarsEmptyHint: '数字人存储肖像和英文外观描述，保持角色一致。',
      addAvatar: '添加数字人', editAvatar: '编辑数字人', avatarName: '数字人名称', avatarNamePh: '例如 小美',
      avatarDesc: '外观描述（英文效果最佳）', avatarDescPh: '例如 一位年轻女性，齐肩黑发，暖色调肤色…', avatarImage: '肖像图片',
      brandKitsEmpty: '还没有品牌套件。创建一个来保持颜色、字体和调性一致。', brandKitsEmptyHint: '品牌套件存储你的 Logo、品牌色、字体和调性备注。',
      addBrandKit: '添加品牌套件', editBrandKit: '编辑品牌套件', brandKitName: '品牌套件名称', brandKitNamePh: '例如 Acme 品牌',
      brandLogo: 'Logo（可选）', brandColors: '品牌色', brandColorAdd: '添加颜色',
      brandFont: '字体备注', brandFontPh: '例如 标题: Space Grotesk; 正文: Inter', brandTone: '调性与风格备注', brandTonePh: '例如 活泼、有活力、自信',
      save: '保存', cancel: '取消', delete: '删除', edit: '编辑', deleteConfirm: '删除此素材？此操作不可撤销。',
      deleteFailed: '删除失败，请重试。', saveFailed: '保存失败，请重试。', uploadFailed: '图片上传失败，请重试。',
      uploading: '上传中…', saving: '保存中…', loading: '加载中…', saved: '已保存', noImage: '无图片',
      useInStudio: '在工作台中使用', selectProduct: '选择产品', selectAvatar: '选择数字人', selectBrandKit: '选择品牌套件',
      select: '选择', none: '无', backToAssets: '← 返回素材库', fromLibrary: '从素材库选择', pickProduct: '选择产品', pickAvatar: '选择数字人',
    },
    dashboard: { subtitle: '选择工作流，查看积分，继续最近的作品。', welcome: '欢迎回来', quickCreate: '创建', recentWork: '最近作品', yourAssets: '你的素材', credits: '积分', buyCredits: '购买积分', noWork: '还没有作品 — 创建你的第一个广告。', noAssets: '还没有素材 — 添加产品、数字人或品牌套件。', viewAll: '查看全部', startNow: '立即开始' },
  },
  ja: {
    nav: { assets: 'アセット', dashboard: 'ダッシュボード', products: 'プロダクト', avatars: 'アバター', brandKits: 'ブランドキット' },
    assets: {
      title: 'アセット', subtitle: '再利用可能なプロダクト、アバター、ブランドキット — 一度保存すれば全ワークフローで使えます。',
      tabProducts: 'プロダクト', tabAvatars: 'アバター', tabBrandKits: 'ブランドキット', signInPrompt: 'サインインしてアセットを管理。',
      productsEmpty: 'プロダクトがありません。広告生成で再利用するには追加してください。', productsEmptyHint: 'プロダクトは参照画像と短い説明を保存し、AI が一貫性を保ちます。',
      addProduct: 'プロダクト追加', editProduct: 'プロダクト編集', productName: 'プロダクト名', productNamePh: '例: Glow Serum',
      productDesc: 'プロダクト説明（英語が最適）', productDescPh: 'ショット間で一貫性を保つ短い英語の説明…',
      productImage: 'プロダクト画像', productSourceUrl: 'ソース URL（任意）', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'アバターがありません。再利用するプレゼンター肖像を追加してください。', avatarsEmptyHint: 'アバターは肖像と英語の外見説明を保存し、キャラクターの一貫性を保ちます。',
      addAvatar: 'アバター追加', editAvatar: 'アバター編集', avatarName: 'アバター名', avatarNamePh: '例: Mia',
      avatarDesc: '外見説明（英語が最適）', avatarDescPh: '例: 肩までの黒髪の若い女性、暖色系の肌色…', avatarImage: '肖像画像',
      brandKitsEmpty: 'ブランドキットがありません。カラー、フォント、トーンを一貫させるために作成してください。', brandKitsEmptyHint: 'ブランドキットはロゴ、ブランドカラー、タイポグラフィ、トーンメモを保存します。',
      addBrandKit: 'ブランドキット追加', editBrandKit: 'ブランドキット編集', brandKitName: 'ブランドキット名', brandKitNamePh: '例: Acme Brand',
      brandLogo: 'ロゴ（任意）', brandColors: 'ブランドカラー', brandColorAdd: 'カラー追加',
      brandFont: 'タイポグラフィメモ', brandFontPh: '例: 見出し: Space Grotesk; 本文: Inter', brandTone: 'トーン＆スタイルメモ', brandTonePh: '例: Playful, energetic, confident',
      save: '保存', cancel: 'キャンセル', delete: '削除', edit: '編集', deleteConfirm: 'このアセットを削除しますか？元に戻せません。',
      deleteFailed: '削除できませんでした。再試行してください。', saveFailed: '保存できませんでした。再試行してください。', uploadFailed: '画像のアップロードに失敗しました。再試行してください。',
      uploading: 'アップロード中…', saving: '保存中…', loading: '読み込み中…', saved: '保存済み', noImage: '画像なし',
      useInStudio: 'スタジオで使用', selectProduct: 'プロダクトを選択', selectAvatar: 'アバターを選択', selectBrandKit: 'ブランドキットを選択',
      select: '選択', none: 'なし', backToAssets: '← アセットへ戻る', fromLibrary: 'ライブラリから', pickProduct: 'プロダクトを選択', pickAvatar: 'アバターを選択',
    },
    dashboard: { subtitle: 'ワークフローを選び、クレジットを確認し、最近の作品に戻りましょう。', welcome: 'おかえりなさい', quickCreate: '作成', recentWork: '最近の作品', yourAssets: 'あなたのアセット', credits: 'クレジット', buyCredits: 'クレジット購入', noWork: 'まだ作品がありません — 最初の広告を作成しましょう。', noAssets: 'まだアセットがありません — プロダクト、アバター、ブランドキットを追加してください。', viewAll: 'すべて表示', startNow: '今すぐ始める' },
  },
  es: {
    nav: { assets: 'Recursos', dashboard: 'Panel', products: 'Productos', avatars: 'Avatares', brandKits: 'Kits de marca' },
    assets: {
      title: 'Recursos', subtitle: 'Productos, avatares y kits de marca reutilizables — guarda una vez, usa en todos los flujos.',
      tabProducts: 'Productos', tabAvatars: 'Avatares', tabBrandKits: 'Kits de marca', signInPrompt: 'Inicia sesión para gestionar tus recursos.',
      productsEmpty: 'Sin productos aún. Añade un producto para reutilizarlo en tus anuncios.', productsEmptyHint: 'Los productos guardan una imagen de referencia y una descripción para que la IA mantenga la consistencia.',
      addProduct: 'Añadir producto', editProduct: 'Editar producto', productName: 'Nombre del producto', productNamePh: 'ej. Glow Serum',
      productDesc: 'Descripción del producto (inglés funciona mejor)', productDescPh: 'Una breve descripción en inglés para mantener consistencia…',
      productImage: 'Imagen del producto', productSourceUrl: 'URL de origen (opcional)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'Sin avatares aún. Añade un retrato de presentador para reutilizarlo.', avatarsEmptyHint: 'Los avatares guardan un retrato y una descripción de apariencia en inglés para personajes consistentes.',
      addAvatar: 'Añadir avatar', editAvatar: 'Editar avatar', avatarName: 'Nombre del avatar', avatarNamePh: 'ej. Mia',
      avatarDesc: 'Descripción de apariencia (inglés funciona mejor)', avatarDescPh: 'ej. Una mujer joven con cabello negro hasta los hombros, tono de piel cálido…', avatarImage: 'Imagen de retrato',
      brandKitsEmpty: 'Sin kits de marca. Crea uno para mantener colores, fuentes y tono consistentes.', brandKitsEmptyHint: 'Los kits de marca guardan tu logo, colores, tipografía y notas de tono.',
      addBrandKit: 'Añadir kit de marca', editBrandKit: 'Editar kit de marca', brandKitName: 'Nombre del kit', brandKitNamePh: 'ej. Acme Brand',
      brandLogo: 'Logo (opcional)', brandColors: 'Colores de marca', brandColorAdd: 'Añadir color',
      brandFont: 'Notas de tipografía', brandFontPh: 'ej. Titulares: Space Grotesk; Cuerpo: Inter', brandTone: 'Notas de tono y estilo', brandTonePh: 'ej. Juguetón, enérgico, seguro',
      save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', deleteConfirm: '¿Eliminar este recurso? No se puede deshacer.',
      deleteFailed: 'No se pudo eliminar. Inténtalo de nuevo.', saveFailed: 'No se pudo guardar. Inténtalo de nuevo.', uploadFailed: 'Error al subir imagen. Inténtalo de nuevo.',
      uploading: 'Subiendo…', saving: 'Guardando…', loading: 'Cargando…', saved: 'Guardado', noImage: 'Sin imagen',
      useInStudio: 'Usar en estudio', selectProduct: 'Seleccionar producto', selectAvatar: 'Seleccionar avatar', selectBrandKit: 'Seleccionar kit de marca',
      select: 'Seleccionar', none: 'Ninguno', backToAssets: '← Volver a recursos', fromLibrary: 'De la biblioteca', pickProduct: 'Elegir producto', pickAvatar: 'Elegir avatar',
    },
    dashboard: { subtitle: 'Elige un flujo de trabajo, revisa tus créditos y vuelve a tu trabajo reciente.', welcome: 'Bienvenido de nuevo', quickCreate: 'Crear', recentWork: 'Trabajo reciente', yourAssets: 'Tus recursos', credits: 'Créditos', buyCredits: 'Comprar créditos', noWork: 'Sin trabajo aún — crea tu primer anuncio.', noAssets: 'Sin recursos aún — añade un producto, avatar o kit de marca.', viewAll: 'Ver todo', startNow: 'Empezar ahora' },
  },
  ko: {
    nav: { assets: '에셋', dashboard: '대시보드', products: '제품', avatars: '아바타', brandKits: '브랜드 키트' },
    assets: {
      title: '에셋', subtitle: '재사용 가능한 제품, 아바타, 브랜드 키트 — 한 번 저장하면 모든 워크플로우에서 사용.',
      tabProducts: '제품', tabAvatars: '아바타', tabBrandKits: '브랜드 키트', signInPrompt: '에셋을 관리하려면 로그인하세요.',
      productsEmpty: '제품이 없습니다. 광고 생성에서 재사용할 제품을 추가하세요.', productsEmptyHint: '제품은 참조 이미지와 짧은 설명을 저장하여 AI가 일관성을 유지합니다.',
      addProduct: '제품 추가', editProduct: '제품 편집', productName: '제품 이름', productNamePh: '예: Glow Serum',
      productDesc: '제품 설명 (영어 권장)', productDescPh: '여러 샷에서 일관성을 유지하는 짧은 영어 설명…',
      productImage: '제품 이미지', productSourceUrl: '소스 URL (선택)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: '아바타가 없습니다. 재사용할 발표자 초상화를 추가하세요.', avatarsEmptyHint: '아바타는 초상화와 영어 외모 설명을 저장하여 캐릭터 일관성을 유지합니다.',
      addAvatar: '아바타 추가', editAvatar: '아바타 편집', avatarName: '아바타 이름', avatarNamePh: '예: Mia',
      avatarDesc: '외모 설명 (영어 권장)', avatarDescPh: '예: 어깨 길이의 검은 머리를 가진 젊은 여성, 따뜻한 피부톤…', avatarImage: '초상 이미지',
      brandKitsEmpty: '브랜드 키트가 없습니다. 색상, 글꼴, 톤을 일관되게 유지하려면 만드세요.', brandKitsEmptyHint: '브랜드 키트는 로고, 브랜드 색상, 타이포그래피, 톤 노트를 저장합니다.',
      addBrandKit: '브랜드 키트 추가', editBrandKit: '브랜드 키트 편집', brandKitName: '브랜드 키트 이름', brandKitNamePh: '예: Acme Brand',
      brandLogo: '로고 (선택)', brandColors: '브랜드 색상', brandColorAdd: '색상 추가',
      brandFont: '타이포그래피 노트', brandFontPh: '예: 헤드라인: Space Grotesk; 본문: Inter', brandTone: '톤 & 스타일 노트', brandTonePh: '예: 장난기 넘치고, 활기차고, 자신감 있는',
      save: '저장', cancel: '취소', delete: '삭제', edit: '편집', deleteConfirm: '이 에셋을 삭제하시겠습니까? 되돌릴 수 없습니다.',
      deleteFailed: '삭제할 수 없습니다. 다시 시도하세요.', saveFailed: '저장할 수 없습니다. 다시 시도하세요.', uploadFailed: '이미지 업로드 실패. 다시 시도하세요.',
      uploading: '업로드 중…', saving: '저장 중…', loading: '로딩 중…', saved: '저장됨', noImage: '이미지 없음',
      useInStudio: '스튜디오에서 사용', selectProduct: '제품 선택', selectAvatar: '아바타 선택', selectBrandKit: '브랜드 키트 선택',
      select: '선택', none: '없음', backToAssets: '← 에셋으로 돌아가기', fromLibrary: '라이브러리에서', pickProduct: '제품 선택', pickAvatar: '아바타 선택',
    },
    dashboard: { subtitle: '워크플로우를 선택하고, 크레딧을 확인하고, 최근 작업으로 돌아가세요.', welcome: '다시 오신 것을 환영합니다', quickCreate: '만들기', recentWork: '최근 작업', yourAssets: '내 에셋', credits: '크레딧', buyCredits: '크레딧 구매', noWork: '아직 작업이 없습니다 — 첫 광고를 만드세요.', noAssets: '아직 에셋이 없습니다 — 제품, 아바타 또는 브랜드 키트를 추가하세요.', viewAll: '전체 보기', startNow: '지금 시작' },
  },
  pt: {
    nav: { assets: 'Ativos', dashboard: 'Painel', products: 'Produtos', avatars: 'Avatares', brandKits: 'Kits de marca' },
    assets: {
      title: 'Ativos', subtitle: 'Produtos, avatares e kits de marca reutilizáveis — salve uma vez, use em todos os fluxos.',
      tabProducts: 'Produtos', tabAvatars: 'Avatares', tabBrandKits: 'Kits de marca', signInPrompt: 'Entre para gerenciar seus ativos.',
      productsEmpty: 'Sem produtos ainda. Adicione um produto para reutilizá-lo em anúncios.', productsEmptyHint: 'Produtos armazenam imagem de referência e descrição para a IA manter consistência.',
      addProduct: 'Adicionar produto', editProduct: 'Editar produto', productName: 'Nome do produto', productNamePh: 'ex: Glow Serum',
      productDesc: 'Descrição do produto (inglês funciona melhor)', productDescPh: 'Uma breve descrição em inglês para manter consistência…',
      productImage: 'Imagem do produto', productSourceUrl: 'URL de origem (opcional)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'Sem avatares ainda. Adicione um retrato de apresentador para reutilizá-lo.', avatarsEmptyHint: 'Avatares armazenam retrato e descrição de aparência em inglês para personagens consistentes.',
      addAvatar: 'Adicionar avatar', editAvatar: 'Editar avatar', avatarName: 'Nome do avatar', avatarNamePh: 'ex: Mia',
      avatarDesc: 'Descrição de aparência (inglês funciona melhor)', avatarDescPh: 'ex: Uma jovem com cabelo preto na altura dos ombros, tom de pele quente…', avatarImage: 'Imagem de retrato',
      brandKitsEmpty: 'Sem kits de marca. Crie um para manter cores, fontes e tom consistentes.', brandKitsEmptyHint: 'Kits de marca armazenam logo, cores, tipografia e notas de tom.',
      addBrandKit: 'Adicionar kit de marca', editBrandKit: 'Editar kit de marca', brandKitName: 'Nome do kit', brandKitNamePh: 'ex: Acme Brand',
      brandLogo: 'Logo (opcional)', brandColors: 'Cores da marca', brandColorAdd: 'Adicionar cor',
      brandFont: 'Notas de tipografia', brandFontPh: 'ex: Títulos: Space Grotesk; Corpo: Inter', brandTone: 'Notas de tom e estilo', brandTonePh: 'ex: Divertido, enérgico, confiante',
      save: 'Salvar', cancel: 'Cancelar', delete: 'Excluir', edit: 'Editar', deleteConfirm: 'Excluir este ativo? Isso não pode ser desfeito.',
      deleteFailed: 'Não foi possível excluir. Tente novamente.', saveFailed: 'Não foi possível salvar. Tente novamente.', uploadFailed: 'Falha no upload da imagem. Tente novamente.',
      uploading: 'Enviando…', saving: 'Salvando…', loading: 'Carregando…', saved: 'Salvo', noImage: 'Sem imagem',
      useInStudio: 'Usar no estúdio', selectProduct: 'Selecionar produto', selectAvatar: 'Selecionar avatar', selectBrandKit: 'Selecionar kit de marca',
      select: 'Selecionar', none: 'Nenhum', backToAssets: '← Voltar para ativos', fromLibrary: 'Da biblioteca', pickProduct: 'Escolher produto', pickAvatar: 'Escolher avatar',
    },
    dashboard: { subtitle: 'Escolha um fluxo de trabalho, verifique seus créditos e volte ao trabalho recente.', welcome: 'Bem-vindo de volta', quickCreate: 'Criar', recentWork: 'Trabalho recente', yourAssets: 'Seus ativos', credits: 'Créditos', buyCredits: 'Comprar créditos', noWork: 'Sem trabalho ainda — crie seu primeiro anúncio.', noAssets: 'Sem ativos ainda — adicione um produto, avatar ou kit de marca.', viewAll: 'Ver tudo', startNow: 'Começar agora' },
  },
  fr: {
    nav: { assets: 'Ressources', dashboard: 'Tableau de bord', products: 'Produits', avatars: 'Avatars', brandKits: 'Kits de marque' },
    assets: {
      title: 'Ressources', subtitle: 'Produits, avatars et kits de marque réutilisables — enregistrez une fois, utilisez partout.',
      tabProducts: 'Produits', tabAvatars: 'Avatars', tabBrandKits: 'Kits de marque', signInPrompt: 'Connectez-vous pour gérer vos ressources.',
      productsEmpty: 'Aucun produit. Ajoutez un produit pour le réutiliser dans vos publicités.', productsEmptyHint: 'Les produits stockent une image de référence et une description pour la cohérence IA.',
      addProduct: 'Ajouter produit', editProduct: 'Modifier produit', productName: 'Nom du produit', productNamePh: 'ex: Glow Serum',
      productDesc: 'Description du produit (anglais recommandé)', productDescPh: 'Une courte description en anglais pour la cohérence…',
      productImage: 'Image du produit', productSourceUrl: 'URL source (optionnel)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'Aucun avatar. Ajoutez un portrait de présentateur pour le réutiliser.', avatarsEmptyHint: 'Les avatars stockent un portrait et une description en anglais pour des personnages cohérents.',
      addAvatar: 'Ajouter avatar', editAvatar: 'Modifier avatar', avatarName: 'Nom de l\'avatar', avatarNamePh: 'ex: Mia',
      avatarDesc: 'Description d\'apparence (anglais recommandé)', avatarDescPh: 'ex: Une jeune femme aux cheveux noirs mi-longs, teint chaud…', avatarImage: 'Image de portrait',
      brandKitsEmpty: 'Aucun kit de marque. Créez-en un pour des couleurs, polices et ton cohérents.', brandKitsEmptyHint: 'Les kits de marque stockent logo, couleurs, typographie et notes de ton.',
      addBrandKit: 'Ajouter kit de marque', editBrandKit: 'Modifier kit de marque', brandKitName: 'Nom du kit', brandKitNamePh: 'ex: Acme Brand',
      brandLogo: 'Logo (optionnel)', brandColors: 'Couleurs de marque', brandColorAdd: 'Ajouter couleur',
      brandFont: 'Notes de typographie', brandFontPh: 'ex: Titres: Space Grotesk; Corps: Inter', brandTone: 'Notes de ton et style', brandTonePh: 'ex: Ludique, énergique, confiant',
      save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', deleteConfirm: 'Supprimer cette ressource ? Irréversible.',
      deleteFailed: 'Impossible de supprimer. Réessayez.', saveFailed: 'Impossible d\'enregistrer. Réessayez.', uploadFailed: 'Échec de l\'upload. Réessayez.',
      uploading: 'Envoi…', saving: 'Enregistrement…', loading: 'Chargement…', saved: 'Enregistré', noImage: 'Pas d\'image',
      useInStudio: 'Utiliser dans le studio', selectProduct: 'Sélectionner un produit', selectAvatar: 'Sélectionner un avatar', selectBrandKit: 'Sélectionner un kit',
      select: 'Sélectionner', none: 'Aucun', backToAssets: '← Retour aux ressources', fromLibrary: 'Depuis la bibliothèque', pickProduct: 'Choisir produit', pickAvatar: 'Choisir avatar',
    },
    dashboard: { subtitle: 'Choisissez un flux, vérifiez vos crédits et reprenez votre travail récent.', welcome: 'Bon retour', quickCreate: 'Créer', recentWork: 'Travail récent', yourAssets: 'Vos ressources', credits: 'Crédits', buyCredits: 'Acheter des crédits', noWork: 'Pas encore de travail — créez votre première publicité.', noAssets: 'Pas encore de ressources — ajoutez un produit, avatar ou kit de marque.', viewAll: 'Voir tout', startNow: 'Commencer maintenant' },
  },
  de: {
    nav: { assets: 'Assets', dashboard: 'Dashboard', products: 'Produkte', avatars: 'Avatare', brandKits: 'Brand Kits' },
    assets: {
      title: 'Assets', subtitle: 'Wiederverwendbare Produkte, Avatare und Brand Kits — einmal speichern, überall nutzen.',
      tabProducts: 'Produkte', tabAvatars: 'Avatare', tabBrandKits: 'Brand Kits', signInPrompt: 'Anmelden um Ihre Assets zu verwalten.',
      productsEmpty: 'Noch keine Produkte. Fügen Sie ein Produkt hinzu, um es in Anzeigen wiederzuverwenden.', productsEmptyHint: 'Produkte speichern Referenzbild und Beschreibung für KI-Konsistenz.',
      addProduct: 'Produkt hinzufügen', editProduct: 'Produkt bearbeiten', productName: 'Produktname', productNamePh: 'z.B. Glow Serum',
      productDesc: 'Produktbeschreibung (Englisch empfohlen)', productDescPh: 'Eine kurze englische Beschreibung für Konsistenz…',
      productImage: 'Produktbild', productSourceUrl: 'Quell-URL (optional)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'Noch keine Avatare. Fügen Sie ein Porträt hinzu, um es wiederzuverwenden.', avatarsEmptyHint: 'Avatare speichern Porträt und englische Erscheinungsbeschreibung für konsistente Charaktere.',
      addAvatar: 'Avatar hinzufügen', editAvatar: 'Avatar bearbeiten', avatarName: 'Avatar-Name', avatarNamePh: 'z.B. Mia',
      avatarDesc: 'Erscheinungsbeschreibung (Englisch empfohlen)', avatarDescPh: 'z.B. Eine junge Frau mit schulterlangem schwarzen Haar, warmer Hautton…', avatarImage: 'Porträtbild',
      brandKitsEmpty: 'Noch keine Brand Kits. Erstellen Sie eines für konsistente Farben, Schriftarten und Tonalität.', brandKitsEmptyHint: 'Brand Kits speichern Logo, Markenfarben, Typografie und Tonalität.',
      addBrandKit: 'Brand Kit hinzufügen', editBrandKit: 'Brand Kit bearbeiten', brandKitName: 'Brand Kit Name', brandKitNamePh: 'z.B. Acme Brand',
      brandLogo: 'Logo (optional)', brandColors: 'Markenfarben', brandColorAdd: 'Farbe hinzufügen',
      brandFont: 'Typografie-Notizen', brandFontPh: 'z.B. Headlines: Space Grotesk; Body: Inter', brandTone: 'Tonalitäts-Notizen', brandTonePh: 'z.B. Verspielt, energisch, selbstbewusst',
      save: 'Speichern', cancel: 'Abbrechen', delete: 'Löschen', edit: 'Bearbeiten', deleteConfirm: 'Dieses Asset löschen? Nicht rückgängig machbar.',
      deleteFailed: 'Löschen fehlgeschlagen. Bitte erneut versuchen.', saveFailed: 'Speichern fehlgeschlagen. Bitte erneut versuchen.', uploadFailed: 'Bild-Upload fehlgeschlagen. Bitte erneut versuchen.',
      uploading: 'Wird hochgeladen…', saving: 'Wird gespeichert…', loading: 'Wird geladen…', saved: 'Gespeichert', noImage: 'Kein Bild',
      useInStudio: 'Im Studio verwenden', selectProduct: 'Produkt auswählen', selectAvatar: 'Avatar auswählen', selectBrandKit: 'Brand Kit auswählen',
      select: 'Auswählen', none: 'Keine', backToAssets: '← Zurück zu Assets', fromLibrary: 'Aus Bibliothek', pickProduct: 'Produkt wählen', pickAvatar: 'Avatar wählen',
    },
    dashboard: { subtitle: 'Wählen Sie einen Workflow, prüfen Sie Ihre Credits und setzen Sie Ihre Arbeit fort.', welcome: 'Willkommen zurück', quickCreate: 'Erstellen', recentWork: 'Letzte Arbeiten', yourAssets: 'Ihre Assets', credits: 'Credits', buyCredits: 'Credits kaufen', noWork: 'Noch keine Arbeiten — erstellen Sie Ihre erste Anzeige.', noAssets: 'Noch keine Assets — fügen Sie ein Produkt, Avatar oder Brand Kit hinzu.', viewAll: 'Alle ansehen', startNow: 'Jetzt starten' },
  },
  ar: {
    nav: { assets: 'الأصول', dashboard: 'لوحة التحكم', products: 'المنتجات', avatars: 'الشخصيات', brandKits: 'هوية العلامة' },
    assets: {
      title: 'الأصول', subtitle: 'منتجات وشخصيات وهويات علامة قابلة لإعادة الاستخدام — احفظ مرة واحدة، استخدم في كل المسارات.',
      tabProducts: 'المنتجات', tabAvatars: 'الشخصيات', tabBrandKits: 'هوية العلامة', signInPrompt: 'سجل الدخول لإدارة أصولك.',
      productsEmpty: 'لا توجد منتجات بعد. أضف منتجاً لإعادة استخدامه في الإعلانات.', productsEmptyHint: 'تخزن المنتجات صورة مرجعية ووصفاً قصيراً للحفاظ على اتساق الذكاء الاصطناعي.',
      addProduct: 'إضافة منتج', editProduct: 'تعديل المنتج', productName: 'اسم المنتج', productNamePh: 'مثال: Glow Serum',
      productDesc: 'وصف المنتج (الإنجليزية أفضل)', productDescPh: 'وصف إنجليزي قصير للحفاظ على الاتساق…',
      productImage: 'صورة المنتج', productSourceUrl: 'رابط المصدر (اختياري)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'لا توجد شخصيات بعد. أضف صورة مقدّم لإعادة استخدامها.', avatarsEmptyHint: 'تخزن الشخصيات صورة ووصفاً بالإنجليزية للحفاظ على اتساق الشخصيات.',
      addAvatar: 'إضافة شخصية', editAvatar: 'تعديل الشخصية', avatarName: 'اسم الشخصية', avatarNamePh: 'مثال: ميا',
      avatarDesc: 'وصف المظهر (الإنجليزية أفضل)', avatarDescPh: 'مثال: شابة بشعر أسود بطول الكتف، بشرة دافئة…', avatarImage: 'صورة الشخصية',
      brandKitsEmpty: 'لا توجد هويات علامة بعد. أنشئ واحدة للحفاظ على اتساق الألوان والخطوط والنبرة.', brandKitsEmptyHint: 'تخزن هويات العلامة الشعار والألوان والخطوط وملاحظات النبرة.',
      addBrandKit: 'إضافة هوية علامة', editBrandKit: 'تعديل هوية العلامة', brandKitName: 'اسم هوية العلامة', brandKitNamePh: 'مثال: Acme Brand',
      brandLogo: 'الشعار (اختياري)', brandColors: 'ألوان العلامة', brandColorAdd: 'إضافة لون',
      brandFont: 'ملاحظات الخطوط', brandFontPh: 'مثال: العناوين: Space Grotesk; النص: Inter', brandTone: 'ملاحظات النبرة والأسلوب', brandTonePh: 'مثال: مرح، نشيط، واثق',
      save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', deleteConfirm: 'حذف هذا الأصل؟ لا يمكن التراجع.',
      deleteFailed: 'تعذر الحذف. حاول مرة أخرى.', saveFailed: 'تعذر الحفظ. حاول مرة أخرى.', uploadFailed: 'فشل رفع الصورة. حاول مرة أخرى.',
      uploading: 'جارٍ الرفع…', saving: 'جارٍ الحفظ…', loading: 'جارٍ التحميل…', saved: 'تم الحفظ', noImage: 'لا توجد صورة',
      useInStudio: 'استخدام في الاستوديو', selectProduct: 'اختر منتجاً', selectAvatar: 'اختر شخصية', selectBrandKit: 'اختر هوية علامة',
      select: 'اختيار', none: 'لا شيء', backToAssets: '← العودة إلى الأصول', fromLibrary: 'من المكتبة', pickProduct: 'اختر منتجاً', pickAvatar: 'اختر شخصية',
    },
    dashboard: { subtitle: 'اختر مسار عمل، تحقق من رصيدك، وعد إلى عملك الأخير.', welcome: 'مرحباً بعودتك', quickCreate: 'إنشاء', recentWork: 'العمل الأخير', yourAssets: 'أصولك', credits: 'الرصيد', buyCredits: 'شراء الرصيد', noWork: 'لا يوجد عمل بعد — أنشئ إعلانك الأول.', noAssets: 'لا توجد أصول بعد — أضف منتجاً أو شخصية أو هوية علامة.', viewAll: 'عرض الكل', startNow: 'ابدأ الآن' },
  },
  hi: {
    nav: { assets: 'संपत्तियाँ', dashboard: 'डैशबोर्ड', products: 'उत्पाद', avatars: 'अवतार', brandKits: 'ब्रांड किट' },
    assets: {
      title: 'संपत्तियाँ', subtitle: 'पुनः उपयोग योग्य उत्पाद, अवतार और ब्रांड किट — एक बार सहेजें, हर वर्कफ़्लो में उपयोग करें।',
      tabProducts: 'उत्पाद', tabAvatars: 'अवतार', tabBrandKits: 'ब्रांड किट', signInPrompt: 'अपनी संपत्तियाँ प्रबंधित करने के लिए साइन इन करें।',
      productsEmpty: 'अभी कोई उत्पाद नहीं। विज्ञापनों में पुनः उपयोग के लिए उत्पाद जोड़ें।', productsEmptyHint: 'उत्पाद संदर्भ छवि और संक्षिप्त विवरण सहेजते हैं ताकि AI सुसंगत रहे।',
      addProduct: 'उत्पाद जोड़ें', editProduct: 'उत्पाद संपादित करें', productName: 'उत्पाद का नाम', productNamePh: 'उदा: Glow Serum',
      productDesc: 'उत्पाद विवरण (अंग्रेजी सर्वोत्तम)', productDescPh: 'सुसंगतता के लिए संक्षिप्त अंग्रेजी विवरण…',
      productImage: 'उत्पाद छवि', productSourceUrl: 'स्रोत URL (वैकल्पिक)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'अभी कोई अवतार नहीं। पुनः उपयोग के लिए प्रस्तुतकर्ता चित्र जोड़ें।', avatarsEmptyHint: 'अवतार चित्र और अंग्रेजी उपस्थिति विवरण सहेजते हैं।',
      addAvatar: 'अवतार जोड़ें', editAvatar: 'अवतार संपादित करें', avatarName: 'अवतार का नाम', avatarNamePh: 'उदा: मिया',
      avatarDesc: 'उपस्थिति विवरण (अंग्रेजी सर्वोत्तम)', avatarDescPh: 'उदा: कंधे तक काले बालों वाली युवा महिला, गर्म त्वचा टोन…', avatarImage: 'चित्र छवि',
      brandKitsEmpty: 'अभी कोई ब्रांड किट नहीं। रंग, फ़ॉन्ट और टोन सुसंगत रखने के लिए बनाएं।', brandKitsEmptyHint: 'ब्रांड किट आपका लोगो, ब्रांड रंग, टाइपोग्राफी और टोन नोट्स सहेजते हैं।',
      addBrandKit: 'ब्रांड किट जोड़ें', editBrandKit: 'ब्रांड किट संपादित करें', brandKitName: 'ब्रांड किट का नाम', brandKitNamePh: 'उदा: Acme Brand',
      brandLogo: 'लोगो (वैकल्पिक)', brandColors: 'ब्रांड रंग', brandColorAdd: 'रंग जोड़ें',
      brandFont: 'टाइपोग्राफी नोट्स', brandFontPh: 'उदा: शीर्षक: Space Grotesk; मुख्य: Inter', brandTone: 'टोन और शैली नोट्स', brandTonePh: 'उदा: मज़ाकिया, ऊर्जावान, आत्मविश्वासी',
      save: 'सहेजें', cancel: 'रद्द करें', delete: 'हटाएं', edit: 'संपादित करें', deleteConfirm: 'इस संपत्ति को हटाएं? यह पूर्ववत नहीं किया जा सकता।',
      deleteFailed: 'हटाया नहीं जा सका। पुनः प्रयास करें।', saveFailed: 'सहेजा नहीं जा सका। पुनः प्रयास करें।', uploadFailed: 'छवि अपलोड विफल। पुनः प्रयास करें।',
      uploading: 'अपलोड हो रहा है…', saving: 'सहेजा जा रहा है…', loading: 'लोड हो रहा है…', saved: 'सहेजा गया', noImage: 'कोई छवि नहीं',
      useInStudio: 'स्टूडियो में उपयोग करें', selectProduct: 'उत्पाद चुनें', selectAvatar: 'अवतार चुनें', selectBrandKit: 'ब्रांड किट चुनें',
      select: 'चुनें', none: 'कोई नहीं', backToAssets: '← संपत्तियों पर वापस', fromLibrary: 'लाइब्रेरी से', pickProduct: 'उत्पाद चुनें', pickAvatar: 'अवतार चुनें',
    },
    dashboard: { subtitle: 'वर्कफ़्लो चुनें, क्रेडिट जांचें, और हाल के काम पर लौटें।', welcome: 'वापसी पर स्वागत है', quickCreate: 'बनाएं', recentWork: 'हाल का काम', yourAssets: 'आपकी संपत्तियाँ', credits: 'क्रेडिट', buyCredits: 'क्रेडिट खरीदें', noWork: 'अभी कोई काम नहीं — अपना पहला विज्ञापन बनाएं।', noAssets: 'अभी कोई संपत्ति नहीं — उत्पाद, अवतार या ब्रांड किट जोड़ें।', viewAll: 'सभी देखें', startNow: 'अभी शुरू करें' },
  },
  vi: {
    nav: { assets: 'Tài sản', dashboard: 'Bảng điều khiển', products: 'Sản phẩm', avatars: 'Avatar', brandKits: 'Bộ thương hiệu' },
    assets: {
      title: 'Tài sản', subtitle: 'Sản phẩm, avatar và bộ thương hiệu tái sử dụng — lưu một lần, dùng mọi nơi.',
      tabProducts: 'Sản phẩm', tabAvatars: 'Avatar', tabBrandKits: 'Bộ thương hiệu', signInPrompt: 'Đăng nhập để quản lý tài sản.',
      productsEmpty: 'Chưa có sản phẩm. Thêm sản phẩm để tái sử dụng trong quảng cáo.', productsEmptyHint: 'Sản phẩm lưu hình ảnh tham chiếu và mô tả ngắn để AI giữ nhất quán.',
      addProduct: 'Thêm sản phẩm', editProduct: 'Sửa sản phẩm', productName: 'Tên sản phẩm', productNamePh: 'vd: Glow Serum',
      productDesc: 'Mô tả sản phẩm (tiếng Anh tốt nhất)', productDescPh: 'Mô tả tiếng Anh ngắn để giữ nhất quán…',
      productImage: 'Hình sản phẩm', productSourceUrl: 'URL nguồn (tùy chọn)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'Chưa có avatar. Thêm chân dung người trình bày để tái sử dụng.', avatarsEmptyHint: 'Avatar lưu chân dung và mô tả ngoại hình tiếng Anh.',
      addAvatar: 'Thêm avatar', editAvatar: 'Sửa avatar', avatarName: 'Tên avatar', avatarNamePh: 'vd: Mia',
      avatarDesc: 'Mô tả ngoại hình (tiếng Anh tốt nhất)', avatarDescPh: 'vd: Phụ nữ trẻ tóc đen ngang vai, nước da ấm…', avatarImage: 'Hình chân dung',
      brandKitsEmpty: 'Chưa có bộ thương hiệu. Tạo một bộ để giữ màu, phông chữ và giọng điệu nhất quán.', brandKitsEmptyHint: 'Bộ thương hiệu lưu logo, màu thương hiệu, typografi và ghi chú giọng điệu.',
      addBrandKit: 'Thêm bộ thương hiệu', editBrandKit: 'Sửa bộ thương hiệu', brandKitName: 'Tên bộ thương hiệu', brandKitNamePh: 'vd: Acme Brand',
      brandLogo: 'Logo (tùy chọn)', brandColors: 'Màu thương hiệu', brandColorAdd: 'Thêm màu',
      brandFont: 'Ghi chú typografi', brandFontPh: 'vd: Tiêu đề: Space Grotesk; Thân: Inter', brandTone: 'Ghi chú giọng điệu & phong cách', brandTonePh: 'vd: Vui nhộn, năng động, tự tin',
      save: 'Lưu', cancel: 'Hủy', delete: 'Xóa', edit: 'Sửa', deleteConfirm: 'Xóa tài sản này? Không thể hoàn tác.',
      deleteFailed: 'Không thể xóa. Thử lại.', saveFailed: 'Không thể lưu. Thử lại.', uploadFailed: 'Tải ảnh thất bại. Thử lại.',
      uploading: 'Đang tải…', saving: 'Đang lưu…', loading: 'Đang tải…', saved: 'Đã lưu', noImage: 'Không có hình',
      useInStudio: 'Dùng trong studio', selectProduct: 'Chọn sản phẩm', selectAvatar: 'Chọn avatar', selectBrandKit: 'Chọn bộ thương hiệu',
      select: 'Chọn', none: 'Không', backToAssets: '← Quay lại tài sản', fromLibrary: 'Từ thư viện', pickProduct: 'Chọn sản phẩm', pickAvatar: 'Chọn avatar',
    },
    dashboard: { subtitle: 'Chọn quy trình, kiểm tra tín dụng và quay lại công việc gần đây.', welcome: 'Chào mừng trở lại', quickCreate: 'Tạo', recentWork: 'Công việc gần đây', yourAssets: 'Tài sản của bạn', credits: 'Tín dụng', buyCredits: 'Mua tín dụng', noWork: 'Chưa có công việc — tạo quảng cáo đầu tiên.', noAssets: 'Chưa có tài sản — thêm sản phẩm, avatar hoặc bộ thương hiệu.', viewAll: 'Xem tất cả', startNow: 'Bắt đầu ngay' },
  },
  th: {
    nav: { assets: 'สินทรัพย์', dashboard: 'แดชบอร์ด', products: 'สินค้า', avatars: 'อวตาร', brandKits: 'ชุดแบรนด์' },
    assets: {
      title: 'สินทรัพย์', subtitle: 'สินค้า อวตาร และชุดแบรนด์ที่นำกลับมาใช้ใหม่ได้ — บันทึกครั้งเดียว ใช้ในทุกเวิร์กโฟลว์',
      tabProducts: 'สินค้า', tabAvatars: 'อวตาร', tabBrandKits: 'ชุดแบรนด์', signInPrompt: 'เข้าสู่ระบบเพื่อจัดการสินทรัพย์',
      productsEmpty: 'ยังไม่มีสินค้า เพิ่มสินค้าเพื่อนำกลับมาใช้ในโฆษณา', productsEmptyHint: 'สินค้าเก็บภาพอ้างอิงและคำอธิบายสั้นๆ เพื่อให้ AI รักษาความสอดคล้อง',
      addProduct: 'เพิ่มสินค้า', editProduct: 'แก้ไขสินค้า', productName: 'ชื่อสินค้า', productNamePh: 'เช่น Glow Serum',
      productDesc: 'คำอธิบายสินค้า (แนะนำภาษาอังกฤษ)', productDescPh: 'คำอธิบายภาษาอังกฤษสั้นๆ เพื่อรักษาความสอดคล้อง…',
      productImage: 'ภาพสินค้า', productSourceUrl: 'URL แหล่งที่มา (ไม่บังคับ)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'ยังไม่มีอวตาร เพิ่มภาพผู้นำเสนอเพื่อนำกลับมาใช้', avatarsEmptyHint: 'อวตารเก็บภาพและคำอธิบายลักษณะภาษาอังกฤษ',
      addAvatar: 'เพิ่มอวตาร', editAvatar: 'แก้ไขอวตาร', avatarName: 'ชื่ออวตาร', avatarNamePh: 'เช่น Mia',
      avatarDesc: 'คำอธิบายลักษณะ (แนะนำภาษาอังกฤษ)', avatarDescPh: 'เช่น หญิงสาวผมดำยาวถึงไหล่ ผิวโทนอุ่น…', avatarImage: 'ภาพบุคคล',
      brandKitsEmpty: 'ยังไม่มีชุดแบรนด์ สร้างเพื่อรักษาสี ฟอนต์ และโทนให้สอดคล้อง', brandKitsEmptyHint: 'ชุดแบรนด์เก็บโลโก้ สีแบรนด์ ทิปโพกราฟี และบันทึกโทน',
      addBrandKit: 'เพิ่มชุดแบรนด์', editBrandKit: 'แก้ไขชุดแบรนด์', brandKitName: 'ชื่อชุดแบรนด์', brandKitNamePh: 'เช่น Acme Brand',
      brandLogo: 'โลโก้ (ไม่บังคับ)', brandColors: 'สีแบรนด์', brandColorAdd: 'เพิ่มสี',
      brandFont: 'บันทึกทิปโพกราฟี', brandFontPh: 'เช่น หัวข้อ: Space Grotesk; เนื้อหา: Inter', brandTone: 'บันทึกโทนและสไตล์', brandTonePh: 'เช่น สนุก มีพลัง มั่นใจ',
      save: 'บันทึก', cancel: 'ยกเลิก', delete: 'ลบ', edit: 'แก้ไข', deleteConfirm: 'ลบสินทรัพย์นี้? ไม่สามารถย้อนกลับได้',
      deleteFailed: 'ไม่สามารถลบ กรุณาลองอีกครั้ง', saveFailed: 'ไม่สามารถบันทึก กรุณาลองอีกครั้ง', uploadFailed: 'อัปโหลดภาพล้มเหลว กรุณาลองอีกครั้ง',
      uploading: 'กำลังอัปโหลด…', saving: 'กำลังบันทึก…', loading: 'กำลังโหลด…', saved: 'บันทึกแล้ว', noImage: 'ไม่มีภาพ',
      useInStudio: 'ใช้ในสตูดิโอ', selectProduct: 'เลือกสินค้า', selectAvatar: 'เลือกอวตาร', selectBrandKit: 'เลือกชุดแบรนด์',
      select: 'เลือก', none: 'ไม่มี', backToAssets: '← กลับสู่สินทรัพย์', fromLibrary: 'จากคลัง', pickProduct: 'เลือกสินค้า', pickAvatar: 'เลือกอวตาร',
    },
    dashboard: { subtitle: 'เลือกเวิร์กโฟลว์ ตรวจสอบเครดิต และกลับสู่งานล่าสุด', welcome: 'ยินดีต้อนรับกลับ', quickCreate: 'สร้าง', recentWork: 'งานล่าสุด', yourAssets: 'สินทรัพย์ของคุณ', credits: 'เครดิต', buyCredits: 'ซื้อเครดิต', noWork: 'ยังไม่มีงาน — สร้างโฆษณาแรกของคุณ', noAssets: 'ยังไม่มีสินทรัพย์ — เพิ่มสินค้า อวตาร หรือชุดแบรนด์', viewAll: 'ดูทั้งหมด', startNow: 'เริ่มเลย' },
  },
  id: {
    nav: { assets: 'Aset', dashboard: 'Dasbor', products: 'Produk', avatars: 'Avatar', brandKits: 'Kit merek' },
    assets: {
      title: 'Aset', subtitle: 'Produk, avatar, dan kit merek yang dapat digunakan ulang — simpan sekali, gunakan di semua alur.',
      tabProducts: 'Produk', tabAvatars: 'Avatar', tabBrandKits: 'Kit merek', signInPrompt: 'Masuk untuk mengelola aset Anda.',
      productsEmpty: 'Belum ada produk. Tambahkan produk untuk digunakan ulang dalam iklan.', productsEmptyHint: 'Produk menyimpan gambar referensi dan deskripsi singkat untuk konsistensi AI.',
      addProduct: 'Tambah produk', editProduct: 'Edit produk', productName: 'Nama produk', productNamePh: 'cth: Glow Serum',
      productDesc: 'Deskripsi produk (bahasa Inggris terbaik)', productDescPh: 'Deskripsi bahasa Inggris singkat untuk konsistensi…',
      productImage: 'Gambar produk', productSourceUrl: 'URL sumber (opsional)', productSourceUrlPh: 'https://your-store.com/product',
      avatarsEmpty: 'Belum ada avatar. Tambahkan potret presenter untuk digunakan ulang.', avatarsEmptyHint: 'Avatar menyimpan potret dan deskripsi penampilan bahasa Inggris.',
      addAvatar: 'Tambah avatar', editAvatar: 'Edit avatar', avatarName: 'Nama avatar', avatarNamePh: 'cth: Mia',
      avatarDesc: 'Deskripsi penampilan (bahasa Inggris terbaik)', avatarDescPh: 'cth: Wanita muda berambut hitam sepanjang bahu, warna kulit hangat…', avatarImage: 'Gambar potret',
      brandKitsEmpty: 'Belum ada kit merek. Buat satu untuk menjaga warna, font, dan nada konsisten.', brandKitsEmptyHint: 'Kit merek menyimpan logo, warna merek, tipografi, dan catatan nada.',
      addBrandKit: 'Tambah kit merek', editBrandKit: 'Edit kit merek', brandKitName: 'Nama kit merek', brandKitNamePh: 'cth: Acme Brand',
      brandLogo: 'Logo (opsional)', brandColors: 'Warna merek', brandColorAdd: 'Tambah warna',
      brandFont: 'Catatan tipografi', brandFontPh: 'cth: Judul: Space Grotesk; Body: Inter', brandTone: 'Catatan nada & gaya', brandTonePh: 'cth: Ceria, energik, percaya diri',
      save: 'Simpan', cancel: 'Batal', delete: 'Hapus', edit: 'Edit', deleteConfirm: 'Hapus aset ini? Tidak dapat dibatalkan.',
      deleteFailed: 'Tidak dapat menghapus. Coba lagi.', saveFailed: 'Tidak dapat menyimpan. Coba lagi.', uploadFailed: 'Gagal mengunggah gambar. Coba lagi.',
      uploading: 'Mengunggah…', saving: 'Menyimpan…', loading: 'Memuat…', saved: 'Tersimpan', noImage: 'Tidak ada gambar',
      useInStudio: 'Gunakan di studio', selectProduct: 'Pilih produk', selectAvatar: 'Pilih avatar', selectBrandKit: 'Pilih kit merek',
      select: 'Pilih', none: 'Tidak ada', backToAssets: '← Kembali ke aset', fromLibrary: 'Dari pustaka', pickProduct: 'Pilih produk', pickAvatar: 'Pilih avatar',
    },
    dashboard: { subtitle: 'Pilih alur kerja, periksa kredit Anda, dan kembali ke pekerjaan terbaru.', welcome: 'Selamat datang kembali', quickCreate: 'Buat', recentWork: 'Pekerjaan terbaru', yourAssets: 'Aset Anda', credits: 'Kredit', buyCredits: 'Beli kredit', noWork: 'Belum ada pekerjaan — buat iklan pertama Anda.', noAssets: 'Belum ada aset — tambahkan produk, avatar, atau kit merek.', viewAll: 'Lihat semua', startNow: 'Mulai sekarang' },
  },
};

// Escape single quotes in translation values
function esc(s) { return s.replace(/'/g, "\\'"); }

// Build the assets block string for a locale
function assetsBlock(locale) {
  const t = translations[locale].assets;
  const lines = ['    assets: {'];
  lines.push(`      title: '${esc(t.title)}',`);
  lines.push(`      subtitle: '${esc(t.subtitle)}',`);
  lines.push(`      tabProducts: '${esc(t.tabProducts)}', tabAvatars: '${esc(t.tabAvatars)}', tabBrandKits: '${esc(t.tabBrandKits)}', signInPrompt: '${esc(t.signInPrompt)}',`);
  lines.push(`      productsEmpty: '${esc(t.productsEmpty)}', productsEmptyHint: '${esc(t.productsEmptyHint)}',`);
  lines.push(`      addProduct: '${esc(t.addProduct)}', editProduct: '${esc(t.editProduct)}', productName: '${esc(t.productName)}', productNamePh: '${esc(t.productNamePh)}',`);
  lines.push(`      productDesc: '${esc(t.productDesc)}', productDescPh: '${esc(t.productDescPh)}',`);
  lines.push(`      productImage: '${esc(t.productImage)}', productSourceUrl: '${esc(t.productSourceUrl)}', productSourceUrlPh: '${esc(t.productSourceUrlPh)}',`);
  lines.push(`      avatarsEmpty: '${esc(t.avatarsEmpty)}', avatarsEmptyHint: '${esc(t.avatarsEmptyHint)}',`);
  lines.push(`      addAvatar: '${esc(t.addAvatar)}', editAvatar: '${esc(t.editAvatar)}', avatarName: '${esc(t.avatarName)}', avatarNamePh: '${esc(t.avatarNamePh)}',`);
  lines.push(`      avatarDesc: '${esc(t.avatarDesc)}', avatarDescPh: '${esc(t.avatarDescPh)}', avatarImage: '${esc(t.avatarImage)}',`);
  lines.push(`      brandKitsEmpty: '${esc(t.brandKitsEmpty)}', brandKitsEmptyHint: '${esc(t.brandKitsEmptyHint)}',`);
  lines.push(`      addBrandKit: '${esc(t.addBrandKit)}', editBrandKit: '${esc(t.editBrandKit)}', brandKitName: '${esc(t.brandKitName)}', brandKitNamePh: '${esc(t.brandKitNamePh)}',`);
  lines.push(`      brandLogo: '${esc(t.brandLogo)}', brandColors: '${esc(t.brandColors)}', brandColorAdd: '${esc(t.brandColorAdd)}',`);
  lines.push(`      brandFont: '${esc(t.brandFont)}', brandFontPh: '${esc(t.brandFontPh)}', brandTone: '${esc(t.brandTone)}', brandTonePh: '${esc(t.brandTonePh)}',`);
  lines.push(`      save: '${esc(t.save)}', cancel: '${esc(t.cancel)}', delete: '${esc(t.delete)}', edit: '${esc(t.edit)}', deleteConfirm: '${esc(t.deleteConfirm)}',`);
  lines.push(`      deleteFailed: '${esc(t.deleteFailed)}', saveFailed: '${esc(t.saveFailed)}', uploadFailed: '${esc(t.uploadFailed)}',`);
  lines.push(`      uploading: '${esc(t.uploading)}', saving: '${esc(t.saving)}', loading: '${esc(t.loading)}', saved: '${esc(t.saved)}', noImage: '${esc(t.noImage)}',`);
  lines.push(`      useInStudio: '${esc(t.useInStudio)}', selectProduct: '${esc(t.selectProduct)}', selectAvatar: '${esc(t.selectAvatar)}', selectBrandKit: '${esc(t.selectBrandKit)}',`);
  lines.push(`      select: '${esc(t.select)}', none: '${esc(t.none)}', backToAssets: '${esc(t.backToAssets)}', fromLibrary: '${esc(t.fromLibrary)}', pickProduct: '${esc(t.pickProduct)}', pickAvatar: '${esc(t.pickAvatar)}',`);
  lines.push('    },');
  return lines.join('\n');
}

// Build dashboard extra keys string for a locale
function dashboardExtra(locale) {
  const t = translations[locale].dashboard;
  const lines = [];
  lines.push(`      subtitle: '${esc(t.subtitle)}',`);
  lines.push(`      welcome: '${esc(t.welcome)}',`);
  lines.push(`      quickCreate: '${esc(t.quickCreate)}', recentWork: '${esc(t.recentWork)}', yourAssets: '${esc(t.yourAssets)}',`);
  lines.push(`      credits: '${esc(t.credits)}', buyCredits: '${esc(t.buyCredits)}',`);
  lines.push(`      noWork: '${esc(t.noWork)}', noAssets: '${esc(t.noAssets)}',`);
  lines.push(`      viewAll: '${esc(t.viewAll)}', startNow: '${esc(t.startNow)}',`);
  return lines.join('\n');
}

// For each locale, find the nav line and add missing keys, find the dashboard block and add missing keys, and insert assets block
for (const [locale, tr] of Object.entries(translations)) {
  // 1. Update nav: add assets, dashboard, products, avatars, brandKits
  // Match: nav: { ... settings: '...' } — capture everything up to and including the last value's closing quote
  const navPattern = new RegExp(`(\\b${locale}: \\{[\\s\\S]*?nav: \\{[^}]*?'[^']*')\\s*\\}\\s*([,;])`);
  const navMatch = src.match(navPattern);
  if (navMatch) {
    const navAdd = `, assets: '${esc(tr.nav.assets)}', dashboard: '${esc(tr.nav.dashboard)}', products: '${esc(tr.nav.products)}', avatars: '${esc(tr.nav.avatars)}', brandKits: '${esc(tr.nav.brandKits)}'`;
    src = src.replace(navPattern, `$1${navAdd} }$2`);
  }

  // 2. Insert assets block before the dashboard block
  const dashboardPattern = new RegExp(`(\\b${locale}: \\{[\\s\\S]*?)(    dashboard: \\{)`);
  if (dashboardPattern.test(src)) {
    src = src.replace(dashboardPattern, `$1${assetsBlock(locale)}\n$2`);
  }

  // 3. Add dashboard extra keys after the existing dashboard opening line
  // Find the dashboard block for this locale and add the new keys after the first existing key
  const dashStartPattern = new RegExp(`(\\b${locale}: \\{[\\s\\S]*?    dashboard: \\{\\s*\\n\\s*)(title:)`);
  if (dashStartPattern.test(src)) {
    src = src.replace(dashStartPattern, `$1${dashboardExtra(locale)}      $2`);
  }
}

writeFileSync(file, src);
console.log('Done! Added assets/dashboard/nav translations to all 12 locales.');
