/* =====================================================================
   三国立志传 · Phase 4 数据文件
   包含：武将数据（五维 + 所在城池 + 喜好礼品 + 剧情文案）
        礼品/名品数据（可购买、可赠予提升亲密度）
        城池扩展数据（治下势力 / 人口）
   说明：采用 JS 对象字面量（兼容 JSON 结构），由 game.js 读取。
   ===================================================================== */
window.GAME_DATA = {

  /* ------------------------------------------------------------
     一、三国武将数据
     stats: 统率 leader / 武力 force / 智力 wit / 政治 politics / 魅力 charm
     gift:  最喜欢的礼品 id（赠送时亲密度大幅提升）
     story: 亲密度达到 40 时触发的剧情/自我介绍文案
     ------------------------------------------------------------ */
  "GENERALS": [
    { "id":"liubei",   "name":"刘备",   "force":"liubei",  "city":"pinyuan",
      "stats":{ "leader":88, "force":62, "wit":78, "politics":84, "charm":98 },
      "gift":"yupei",
      "story":"“备乃中山靖王之后，见天下大乱，百姓流离，常痛于心。大丈夫当以仁义济世，愿与君共图之。”" },

    { "id":"guanyu",   "name":"关羽",   "force":"liubei",  "city":"pinyuan",
      "stats":{ "leader":92, "force":97, "wit":76, "politics":64, "charm":94 },
      "gift":"mingcha",
      "story":"“某自幼习武，颇读《春秋》。平生最重一个‘义’字——愿与君结为生死之交。”" },

    { "id":"zhangfei", "name":"张飞",   "force":"liubei",  "city":"pinyuan",
      "stats":{ "leader":81, "force":98, "wit":42, "politics":38, "charm":52 },
      "gift":"meijiu",
      "story":"“俺乃燕人张翼德！哈哈，看你顺眼，来来来，满饮此碗再说话！”" },

    { "id":"caocao",   "name":"曹操",   "force":"caocao",  "city":"xuchang",
      "stats":{ "leader":96, "force":76, "wit":92, "politics":90, "charm":84 },
      "gift":"bingfa",
      "story":"“宁教我负天下人，休教天下人负我。——方今天下，唯英雄与使君耳。”" },

    { "id":"xiahoudun","name":"夏侯惇", "force":"caocao",  "city":"xuchang",
      "stats":{ "leader":84, "force":90, "wit":58, "politics":66, "charm":70 },
      "gift":"moujian",
      "story":"“吾随主公征战多年，拔矢啖睛尚且不惧。君若有胆，愿与君阵前一晤。”" },

    { "id":"guojia",   "name":"郭嘉",   "force":"caocao",  "city":"xuchang",
      "stats":{ "leader":56, "force":24, "wit":98, "politics":82, "charm":72 },
      "gift":"meijiu",
      "story":"“嘉体弱多病，唯以酒养生，以谋娱心。观君之才，他日必成大器。”" },

    { "id":"yuanshao", "name":"袁绍",   "force":"yuanshao","city":"ye",
      "stats":{ "leader":84, "force":66, "wit":58, "politics":74, "charm":88 },
      "gift":"jinhu",
      "story":"“吾四世三公，门生故吏遍天下。讨伐国贼，舍我其谁！”" },

    { "id":"yanliang", "name":"颜良",   "force":"yuanshao","city":"ye",
      "stats":{ "leader":74, "force":94, "wit":40, "politics":30, "charm":48 },
      "gift":"haohe",
      "story":"“河北名将，颜良是也。有胆便与某大战三百回合！”" },

    { "id":"sunjian",  "name":"孙坚",   "force":"sunjian", "city":"changsha",
      "stats":{ "leader":90, "force":92, "wit":76, "politics":70, "charm":82 },
      "gift":"moujian",
      "story":"“吾乃江东猛虎孙文台！破黄巾、征西凉，靠的是这口刀、这份胆。”" },

    { "id":"huangzhong","name":"黄忠",  "force":"sunjian", "city":"changsha",
      "stats":{ "leader":78, "force":93, "wit":56, "politics":48, "charm":60 },
      "gift":"haohe",
      "story":"“老夫年虽六旬，能开二石之弓，百步穿杨，箭无虚发。”" },

    { "id":"libiao",   "name":"刘表",   "force":"libiao",  "city":"xiangyang",
      "stats":{ "leader":70, "force":48, "wit":62, "politics":80, "charm":76 },
      "gift":"guqin",
      "story":"“荆襄九郡，沃野千里。老夫不求争霸，只愿保境安民。”" },

    { "id":"zhugeliang","name":"诸葛亮","force":"none",    "city":"xiangyang",
      "stats":{ "leader":94, "force":38, "wit":100, "politics":96, "charm":92 },
      "gift":"guqin",
      "story":"“亮躬耕于南阳，苟全性命于乱世，不求闻达于诸侯。然观天下大势，已在胸中。”" },

    { "id":"simahui",  "name":"司马徽", "force":"none",    "city":"xiangyang",
      "stats":{ "leader":52, "force":30, "wit":92, "politics":74, "charm":86 },
      "gift":"mingcha",
      "story":"“好好好……水镜山居虽小，可论天下英雄。卧龙、凤雏，得一可安天下。”" },

    { "id":"dongzhuo", "name":"董卓",   "force":"dongzhuo","city":"changan",
      "stats":{ "leader":78, "force":82, "wit":54, "politics":48, "charm":30 },
      "gift":"jinhu",
      "story":"“哈哈哈……金银美人，天下珍宝，只要老夫高兴，尽可赏你！”" },

    { "id":"lvbu",     "name":"吕布",   "force":"dongzhuo","city":"changan",
      "stats":{ "leader":88, "force":100, "wit":32, "politics":36, "charm":58 },
      "gift":"moujian",
      "story":"“人中吕布，马中赤兔。天下之内，能接某三十合者，屈指可数！”" },

    { "id":"diaochan", "name":"貂蝉",   "force":"none",    "city":"luoyang",
      "stats":{ "leader":40, "force":22, "wit":82, "politics":60, "charm":100 },
      "gift":"guqin",
      "story":"“妾身习得歌舞琴艺，愿为义父分忧。公子雅士，可愿听一曲《凤求凰》？”" },

    { "id":"huatuo",   "name":"华佗",   "force":"none",    "city":"jiangling",
      "stats":{ "leader":46, "force":28, "wit":80, "politics":68, "charm":78 },
      "gift":"yao",
      "story":"“医者，仁术也。老朽毕生所求，唯愿天下人少病少灾。”" },

    { "id":"zhaoyun",  "name":"赵云",   "force":"none",    "city":"jinyang",
      "stats":{ "leader":86, "force":96, "wit":80, "politics":66, "charm":88 },
      "gift":"haohe",
      "story":"“云虽一介白身，然常山赵子龙之名，终将传遍天下。愿寻明主，以展平生所学。”" },

    { "id":"zhouyu",   "name":"周瑜",   "force":"none",    "city":"jianye",
      "stats":{ "leader":92, "force":74, "wit":94, "politics":80, "charm":96 },
      "gift":"guqin",
      "story":"“曲有误，周郎顾。用兵之道与音律相通——皆在‘节奏’二字。”" },

    { "id":"daqiao",   "name":"大乔",   "force":"none",    "city":"wu",
      "stats":{ "leader":34, "force":20, "wit":70, "politics":62, "charm":96 },
      "gift":"chou",
      "story":"“江东烟雨，织得一身锦绣。公子若懂琴音，妾身愿以一曲相和。”" },
  ],

  /* ------------------------------------------------------------
     二、礼品 / 名品数据（市集可购买，赠予武将提升亲密度）
     ------------------------------------------------------------ */
  "ITEMS": [
    { "id":"mingcha", "name":"名茶",     "price":120, "desc":"「理」字当先的名士最爱" },
    { "id":"meijiu",  "name":"陈年美酒", "price":150, "desc":"豪杰猛将的心头好" },
    { "id":"guqin",   "name":"古琴",     "price":400, "desc":"文人雅士、佳人知音" },
    { "id":"bingfa",  "name":"《孙子兵法》","price":500, "desc":"枭雄统帅梦寐以求" },
    { "id":"moujian", "name":"宝剑",     "price":600, "desc":"赠武将最合其心意" },
    { "id":"yupei",   "name":"玉佩",     "price":300, "desc":"温润君子之礼" },
    { "id":"jinhu",   "name":"鎏金壶",   "price":350, "desc":"权贵豪奢之选" },
    { "id":"haohe",   "name":"好马",     "price":800, "desc":"武将见猎心喜" },
  ],

  /* ------------------------------------------------------------
     三、城池扩展数据（治下势力 / 人口规模）
     ------------------------------------------------------------ */
  "CITY_INFO": {
    "luoyang":   { "ruler":"汉室",   "pop":"百万" },
    "changan":   { "ruler":"董卓",   "pop":"八十万" },
    "xuchang":   { "ruler":"曹操",   "pop":"六十万" },
    "wan":       { "ruler":"汉室",   "pop":"十万" },
    "xiangyang": { "ruler":"刘表",   "pop":"五十万" },
    "jiangling": { "ruler":"刘表",   "pop":"二十万" },
    "changsha":  { "ruler":"孙坚",   "pop":"四十万" },
    "chengdu":   { "ruler":"刘焉",   "pop":"七十万" },
    "hanzhong":  { "ruler":"张鲁",   "pop":"十五万" },
    "jianye":    { "ruler":"汉室",   "pop":"三十万" },
    "wu":        { "ruler":"汉室",   "pop":"二十万" },
    "shouchun":  { "ruler":"汉室",   "pop":"二十五万" },
    "xiapi":     { "ruler":"陶谦",   "pop":"三十五万" },
    "beihai":    { "ruler":"孔融",   "pop":"十八万" },
    "pinyuan":   { "ruler":"刘备",   "pop":"八万" },
    "ye":        { "ruler":"袁绍",   "pop":"五十五万" },
    "jinyang":   { "ruler":"汉室",   "pop":"十二万" },
    "beiping":   { "ruler":"公孙瓒", "pop":"二十万" },
  },
};
