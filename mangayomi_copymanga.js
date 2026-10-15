const mangayomiSources = [{
  "name": "拷贝漫画",
  "id": 109412435,
  "lang": "zh",
  "baseUrl": "https://www.copy20.com",
  "apiUrl": "",
  "iconUrl": "https://raw.githubusercontent.com/kodjodevf/mangayomi-extensions/main/javascript/icon/zh.copymanga.png",
  "typeSource": "single",
  "itemType": 0,
  "isNsfw": false,
  "version": "0.0.26",
  "dateFormat": "",
  "dateFormatLocale": "",
  "appMinVerReq": "0.5.0",
  "pkgPath": "manga/src/zh/copymanga.js"
}];

const COPYMANGA_THEMES = [
  ["全部", ""], ["爱情", "aiqing"], ["欢乐向", "huanlexiang"],
  ["冒险", "maoxian"], ["奇幻", "qihuan"], ["百合", "baihe"],
  ["校园", "xiaoyuan"], ["科幻", "kehuan"], ["东方", "dongfang"],
  ["耽美", "danmei"], ["格斗", "gedou"], ["TL", "teenslove"],
  ["生活", "shenghuo"], ["轻小说", "qingxiaoshuo"], ["其他", "qita"],
  ["悬疑", "xuanyi"], ["萌系", "mengxi"], ["神鬼", "shengui"],
  ["职场", "zhichang"], ["治愈", "zhiyu"], ["节操", "jiecao"],
  ["四格", "sige"], ["搞笑", "gaoxiao"], ["长条", "changtiao"],
  ["竞技", "jingji"], ["魔幻", "mohuan"], ["舰娘", "jianniang"],
  ["伪娘", "weiniang"], ["热血", "rexue"], ["惊悚", "jingsong"],
  ["美食", "meishi"], ["性转换", "xingzhuanhuan"], ["励志", "lizhi"],
  ["后宫", "hougong"], ["音乐舞蹈", "yinyuewudao"], ["侦探", "zhentan"],
  ["彩色", "COLOR"], ["AA", "aa"], ["异世界", "yishijie"],
  ["历史", "lishi"], ["穿越", "chuanyue"], ["机战", "jizhan"],
  ["战争", "zhanzheng"], ["都市", "dushi"], ["重生", "chongsheng"],
  ["恐怖", "kongbu"], ["生存", "shengcun"], ["武侠", "wuxia"],
  ["宅系", "zhaixi"], ["转生", "zhuansheng"], ["FATE", "fate"],
  ["无修正", "Uncensored"], ["仙侠", "xianxia"], ["LoveLive", "loveLive"],
  ["C95", "comiket95"], ["C96", "comiket96"], ["C97", "comiket97"],
  ["C98", "C98"], ["C99", "comiket99"], ["C100", "comiket100"],
  ["C101", "comiket101"], ["C102", "comiket102"], ["C103", "comiket103"],
  ["C104", "comiket104"], ["C105", "comiket105"], ["C106", "comiket106"],
  ["C107", "comiket107"], ["C108", "comiket108"],
  ["杂志附赠写真集", "zazhifuzengxiezhenji"]
];

class DefaultExtension extends MProvider {
  get supportsLatest() {
    return true;
  }

  userAgent() {
    return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
  }

  getHeaders(url) {
    return {
      "User-Agent": this.userAgent(),
      "Referer": this.source.baseUrl + "/"
    };
  }

  webHeaders(referer, accept) {
    return {
      "User-Agent": this.userAgent(),
      "Accept": accept || "text/html,application/xhtml+xml,application/json",
      "Referer": referer || this.source.baseUrl + "/",
      "dnts": "9"
    };
  }

  ensureStatus(res, label) {
    if (!res || res.statusCode !== 200) {
      throw new Error(label + "请求失败（HTTP " + (res ? res.statusCode : "未知") + "）");
    }
  }

  parseJsonResponse(res, label) {
    this.ensureStatus(res, label);
    var data;
    try {
      data = JSON.parse(res.body);
    } catch (_) {
      throw new Error(label + "返回了非 JSON 数据");
    }
    var code = Number(data.code == null ? 200 : data.code);
    if (code !== 200) {
      throw new Error(label + "失败（code " + code + "）：" + (data.message || "请求失败"));
    }
    return data;
  }

  mangaFromData(item) {
    var comic = item && item.comic ? item.comic : item;
    if (!comic || !comic.path_word) return null;
    return {
      name: String(comic.name || "未命名"),
      imageUrl: String(comic.cover || ""),
      link: "/comic/" + String(comic.path_word)
    };
  }

  codePoint(code) {
    if (String.fromCodePoint) return String.fromCodePoint(code);
    if (code <= 0xffff) return String.fromCharCode(code);
    code -= 0x10000;
    return String.fromCharCode(0xd800 + (code >> 10), 0xdc00 + (code & 0x3ff));
  }

  // CopyManga embeds list data as a Python-style literal. This parser only
  // accepts primitive literals, arrays and objects; it never executes the text.
  parseWebLiteral(source) {
    var text = String(source || "");
    var index = 0;
    var self = this;

    function fail(message) {
      throw new Error("网页漫画列表格式错误：" + message + "（位置 " + index + "）");
    }

    function skipSpace() {
      while (index < text.length && /\s/.test(text[index])) index++;
    }

    function parseString() {
      var quote = text[index++];
      var value = "";
      while (index < text.length) {
        var ch = text[index++];
        if (ch === quote) return value;
        if (ch !== "\\") {
          value += ch;
          continue;
        }
        if (index >= text.length) fail("字符串转义不完整");
        var escaped = text[index++];
        var simple = {
          "n": "\n", "r": "\r", "t": "\t", "b": "\b",
          "f": "\f", "v": "\v", "\\": "\\", "'": "'", "\"": "\""
        };
        if (simple[escaped] != null) {
          value += simple[escaped];
        } else if (escaped === "x" || escaped === "u" || escaped === "U") {
          var size = escaped === "x" ? 2 : (escaped === "u" ? 4 : 8);
          var digits = text.slice(index, index + size);
          if (!(new RegExp("^[0-9a-f]{" + size + "}$", "i")).test(digits)) {
            fail("Unicode 转义无效");
          }
          value += self.codePoint(parseInt(digits, 16));
          index += size;
        } else {
          value += escaped;
        }
      }
      fail("字符串没有结束引号");
    }

    function parseValue() {
      skipSpace();
      if (index >= text.length) fail("缺少值");
      var ch = text[index];
      if (ch === "'" || ch === "\"") return parseString();
      if (ch === "[") {
        index++;
        var array = [];
        skipSpace();
        if (text[index] === "]") {
          index++;
          return array;
        }
        while (index < text.length) {
          array.push(parseValue());
          skipSpace();
          if (text[index] === "]") {
            index++;
            return array;
          }
          if (text[index++] !== ",") fail("数组缺少逗号");
          skipSpace();
          if (text[index] === "]") {
            index++;
            return array;
          }
        }
        fail("数组没有结束括号");
      }
      if (ch === "{") {
        index++;
        var object = {};
        skipSpace();
        if (text[index] === "}") {
          index++;
          return object;
        }
        while (index < text.length) {
          skipSpace();
          if (text[index] !== "'" && text[index] !== "\"") fail("对象键不是字符串");
          var key = parseString();
          skipSpace();
          if (text[index++] !== ":") fail("对象键后缺少冒号");
          object[key] = parseValue();
          skipSpace();
          if (text[index] === "}") {
            index++;
            return object;
          }
          if (text[index++] !== ",") fail("对象缺少逗号");
          skipSpace();
          if (text[index] === "}") {
            index++;
            return object;
          }
        }
        fail("对象没有结束括号");
      }
      var rest = text.slice(index);
      var keyword = rest.match(/^(True|False|None|null|true|false)\b/);
      if (keyword) {
        index += keyword[0].length;
        if (keyword[1] === "True" || keyword[1] === "true") return true;
        if (keyword[1] === "False" || keyword[1] === "false") return false;
        return null;
      }
      var number = rest.match(/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
      if (number) {
        index += number[0].length;
        return Number(number[0]);
      }
      fail("不支持的值");
    }

    var result = parseValue();
    skipSpace();
    if (index !== text.length) fail("末尾有多余内容");
    return result;
  }

  async getWebMangaList(page, filters) {
    var limit = 30;
    var offset = (page - 1) * limit;
    var query = [];
    filters = filters || {};
    if (filters.theme) query.push("theme=" + encodeURIComponent(filters.theme));
    if (filters.region !== "" && filters.region != null) {
      query.push("region=" + encodeURIComponent(filters.region));
    }
    if (filters.status !== "" && filters.status != null) {
      query.push("status=" + encodeURIComponent(filters.status));
    }
    query.push("ordering=" + encodeURIComponent(filters.ordering || "-datetime_updated"));
    query.push("offset=" + offset);
    query.push("limit=" + limit);

    var url = this.source.baseUrl + "/comics?" + query.join("&");
    var res = await new Client().get(url, this.webHeaders(this.source.baseUrl + "/comics"));
    this.ensureStatus(res, "网页漫画列表");
    var doc = new Document(res.body);
    var box = doc.selectFirst(".exemptComic-box");
    var literal = box.attr("list");
    if (!literal) throw new Error("网页漫画列表缺少 list 属性");
    var data = this.parseWebLiteral(literal);
    if (!Array.isArray(data)) throw new Error("网页漫画列表不是数组");
    var total = Number(box.attr("total") || data.length);
    var list = data.map((item) => this.mangaFromData(item)).filter(Boolean);
    return {
      list: list,
      hasNextPage: offset + list.length < total
    };
  }

  async getPopular(page) {
    return await this.getWebMangaList(page, { ordering: "-popular" });
  }

  async getLatestUpdates(page) {
    return await this.getWebMangaList(page, { ordering: "-datetime_updated" });
  }

  filterValue(filters, type, fallback) {
    for (var filter of filters || []) {
      if (filter && filter.type === type && Array.isArray(filter.values)) {
        var selected = filter.values[Number(filter.state || 0)];
        return selected && selected.value != null ? String(selected.value) : fallback;
      }
    }
    return fallback;
  }

  async search(query, page, filters) {
    if (query && String(query).trim()) {
      var limit = 30;
      var offset = (page - 1) * limit;
      var url = this.source.baseUrl + "/api/kb/web/searchcl/comics" +
        "?offset=" + offset + "&platform=2&limit=" + limit +
        "&q=" + encodeURIComponent(String(query).trim()) + "&q_type=";
      var res = await new Client().get(
        url,
        this.webHeaders(this.source.baseUrl + "/search", "application/json")
      );
      var data = this.parseJsonResponse(res, "搜索");
      var results = data.results || {};
      var rawList = Array.isArray(results.list) ? results.list : [];
      var list = rawList.map((item) => this.mangaFromData(item)).filter(Boolean);
      var total = Number(results.total || list.length);
      return { list: list, hasNextPage: offset + list.length < total };
    }

    return await this.getWebMangaList(page, {
      theme: this.filterValue(filters, "theme", ""),
      region: this.filterValue(filters, "region", ""),
      status: this.filterValue(filters, "status", ""),
      ordering: this.filterValue(filters, "sort", "-datetime_updated")
    });
  }

  base64FromHex(hex) {
    if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
      throw new Error("网页密文不是有效十六进制");
    }
    var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var output = "";
    for (var i = 0; i < hex.length; i += 6) {
      var remaining = Math.min(6, hex.length - i);
      var b1 = parseInt(hex.slice(i, i + 2), 16);
      var b2 = remaining >= 4 ? parseInt(hex.slice(i + 2, i + 4), 16) : 0;
      var b3 = remaining >= 6 ? parseInt(hex.slice(i + 4, i + 6), 16) : 0;
      output += alphabet[b1 >> 2];
      output += alphabet[((b1 & 3) << 4) | (b2 >> 4)];
      output += remaining >= 4 ? alphabet[((b2 & 15) << 2) | (b3 >> 6)] : "=";
      output += remaining >= 6 ? alphabet[b3 & 63] : "=";
    }
    return output;
  }

  decodePayload(payload, key) {
    payload = String(payload || "");
    if (payload.length <= 16) throw new Error("网页加密数据为空");
    var iv = payload.slice(0, 16);
    var encrypted = this.base64FromHex(payload.slice(16));
    var text = cryptoHandler(encrypted, iv, key || "0p0zzpvv.nmn.oop", false);
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error("网页数据 AES 解密或 JSON 解析失败");
    }
  }

  comicSlug(url) {
    var value = String(url || "");
    var marker = "/comic/";
    var index = value.indexOf(marker);
    if (index >= 0) value = value.slice(index + marker.length);
    return decodeURIComponent(value.split(/[/?#]/)[0]);
  }

  statusCode(text) {
    text = String(text || "");
    if (/完結|完结/.test(text)) return 1;
    if (/連載|连载/.test(text)) return 0;
    if (/休載|休载|暫停|暂停/.test(text)) return 2;
    return 5;
  }

  async getChapters(slug) {
    var res = await new Client().get(
      this.source.baseUrl + "/comicdetail/" + encodeURIComponent(slug) + "/chapters",
      this.webHeaders(this.source.baseUrl + "/comic/" + encodeURIComponent(slug), "application/json")
    );
    var envelope = this.parseJsonResponse(res, "章节列表");
    var data = this.decodePayload(envelope.results, "0p0zzpvv.nmn.oop");
    var groups = data.groups || {};
    var groupKeys = Object.keys(groups);
    var chapters = [];
    for (var groupIndex = 0; groupIndex < groupKeys.length; groupIndex++) {
      var group = groups[groupKeys[groupIndex]] || {};
      var items = Array.isArray(group.chapters) ? group.chapters : [];
      for (var i = 0; i < items.length; i++) {
        var chapter = items[i];
        var id = chapter && (chapter.id || chapter.uuid);
        if (!id) continue;
        var name = String(chapter.name || "未命名章节");
        if (groupKeys.length > 1 && group.name) name = String(group.name) + " · " + name;
        chapters.push({
          name: name,
          url: slug + "|" + String(id),
          scanlator: null,
          dateUpload: null
        });
      }
    }
    chapters.reverse();
    return chapters;
  }

  async getDetail(url) {
    var slug = this.comicSlug(url);
    if (!slug) throw new Error("无效漫画地址");
    var comicUrl = this.source.baseUrl + "/comic/" + encodeURIComponent(slug);
    var res = await new Client().get(comicUrl, this.webHeaders(this.source.baseUrl + "/"));
    this.ensureStatus(res, "漫画详情");
    var doc = new Document(res.body);
    var titleElement = doc.selectFirst(".comicParticulars-title-right h6");
    var coverElement = doc.selectFirst(".comicParticulars-left-img img");
    var title = titleElement.attr("title") || titleElement.text;
    var cover = coverElement.attr("data-src") || coverElement.attr("src");
    if (!title || !cover) throw new Error("漫画详情缺少标题或封面");

    var authors = doc.select(".comicParticulars-title-right a[href^='/author/']")
      .map((element) => element.text.trim()).filter(Boolean);
    var genres = doc.select(".comicParticulars-tag a")
      .map((element) => element.text.replace(/^#/, "").trim()).filter(Boolean);
    var statusText = "";
    var infoRows = doc.select(".comicParticulars-title-right li");
    for (var i = 0; i < infoRows.length; i++) {
      var rowText = infoRows[i].text.trim();
      if (/^(狀態|状态)[：:]/.test(rowText)) statusText = rowText;
    }

    return {
      name: title.trim(),
      imageUrl: cover,
      description: doc.selectFirst("p.intro").text.trim(),
      author: authors.join("、"),
      artist: "",
      status: this.statusCode(statusText),
      genre: genres,
      chapters: await this.getChapters(slug),
      link: "/comic/" + slug
    };
  }

  async getPageList(url) {
    var parts = String(url || "").split("|");
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("无效章节地址");
    var chapterUrl = this.source.baseUrl + "/comic/" + encodeURIComponent(parts[0]) +
      "/chapter/" + encodeURIComponent(parts[1]);
    var res = await new Client().get(
      chapterUrl,
      this.webHeaders(this.source.baseUrl + "/comic/" + encodeURIComponent(parts[0]))
    );
    this.ensureStatus(res, "章节图片");
    var contentMatch = String(res.body || "").match(/\bcontentKey\s*=\s*['\"]([^'\"]+)['\"]/);
    if (!contentMatch) throw new Error("章节页缺少 contentKey");
    var keyMatch = String(res.body || "").match(/\bcct\s*=\s*['\"]([^'\"]+)['\"]/);
    var contents = this.decodePayload(
      contentMatch[1],
      keyMatch ? keyMatch[1] : "0p0zzpvv.nmn.oop"
    );
    if (!Array.isArray(contents)) throw new Error("章节图片不是数组");
    var headers = this.getHeaders(chapterUrl);
    return contents.map((item) => ({
      url: typeof item === "string" ? item : item.url,
      headers: headers
    })).filter((item) => item.url);
  }

  selectFilter(type, name, values) {
    return {
      type: type,
      name: name,
      type_name: "SelectFilter",
      state: 0,
      values: values.map((item) => ({
        type_name: "SelectOption",
        name: item[0],
        value: item[1]
      }))
    };
  }

  getFilterList() {
    return [
      this.selectFilter("theme", "题材", COPYMANGA_THEMES),
      this.selectFilter("region", "地区", [
        ["全部", ""], ["日漫", "0"], ["韩漫", "1"], ["美漫", "2"]
      ]),
      this.selectFilter("status", "状态", [
        ["全部", ""], ["连载中", "0"], ["已完结", "1"], ["短篇", "2"]
      ]),
      this.selectFilter("sort", "排序", [
        ["更新时间↓", "-datetime_updated"], ["更新时间↑", "datetime_updated"],
        ["热度↓", "-popular"], ["热度↑", "popular"]
      ])
    ];
  }

  getSourcePreferences() {
    return [];
  }
}
