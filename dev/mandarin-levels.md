# Mandarin: teckenprogression

Nivåerna är kumulativa. Varje nivå innehåller alla tidigare tecken och sitt eget nytillskott; spelet väljer bland hela den aktuella nivån. Traditionell och förenklad skrift följer samma begrepp i samma ordning. Övningsnamn, interna id:n och pinyinens femsekundersfördröjning är oförändrade.

| Nivå | Nya tecken | Totalt | Inriktning | Genomsnittliga streck i nya tecken, traditionell / förenklad |
|---|---:|---:|---|---:|
| 1 | 30 | 30 | Tal 0–10, konkreta grunder samt 我, 你 och 好 | 3.83 / 3.83 |
| 2 | 50 | 80 | Vanliga småord, familj och enkla handlingar | 6.64 / 5.86 |
| 3 | 75 | 155 | Hem, riktningar, tid, mat och bekanta saker | 7.87 / 6.71 |
| 4 | 100 | 255 | Skola, samtal, fler handlingar och tätare tecken | 11.83 / 8.56 |

Urvalet är en pedagogisk bedömning för denna spelövning, inte en officiell språkstandard eller en strikt frekvensrankning. Barnnära betydelser och vanliga uttryck väger tungt. Visuell komplexitet används tillsammans med nytta, inte som enda sorteringsregel: 零 är med direkt för att fullborda talen 0–10, och 媽 kommer tidigt trots fler streck. Tätare tecken som 聽 och 體 kommer senare. De nytillkomna tecknens medelvärden ökar i båda skrifterna; enskilda enkla men mindre prioriterade tecken kan ändå komma senare.

Streckkontrollen använder `kTotalStrokes` från [Unicode Unihan 17.0.0](https://www.unicode.org/Public/17.0.0/ucd/Unihan.zip), med första angivna värdet per kodpunkt. [Unihan-dokumentationen](https://www.unicode.org/reports/tr38/) beskriver egenskaper och regionala varianter. Detta är en grov kontroll av täthet, inte ett mått på lässvårighet. Ingen ny databas laddas ned av spelet.

Pinyin och skriftpar återanvänder den befintliga listan. De fyra tilläggen är 嗎/吗 (`ma`), 呢 (`ne`), 目 (`mù`) och 兩/两 (`liǎng`). Det fristående 子 visas med `zǐ`, snarare än suffixets neutrala `zi`. Grundformen används för enstaka tecken; tonlös talmatchning är oförändrad.

Nedan listas bara nytillskotten. Ingen teckendubblett finns mellan nytillskotten i någon skrift.

## Nivå 1: 30 nya tecken

Traditionella:

一 二 三 四 五 六 七 八 九 十 零 人 大 小 上 下 中 口 手 日 月 山 水 火 木

土 天 我 你 好

Förenklade:

一 二 三 四 五 六 七 八 九 十 零 人 大 小 上 下 中 口 手 日 月 山 水 火 木

土 天 我 你 好

## Nivå 2: 50 nya tecken

Traditionella:

不 了 的 是 有 在 也 他 她 它 子 女 男 爸 媽 哥 姐 弟 妹 友 多 少 幾 這 那

哪 什 麼 嗎 呢 來 去 出 回 走 吃 看 要 用 打 今 明 早 年 白 耳 目 牛 羊 米

Förenklade:

不 了 的 是 有 在 也 他 她 它 子 女 男 爸 妈 哥 姐 弟 妹 友 多 少 几 这 那

哪 什 么 吗 呢 来 去 出 回 走 吃 看 要 用 打 今 明 早 年 白 耳 目 牛 羊 米

## Nivå 3: 75 nya tecken

Traditionella:

們 自 己 父 母 兒 家 名 字 文 左 右 前 後 裡 外 東 西 南 北 百 千 兩 個 本

分 午 晚 時 間 雨 風 花 草 林 河 海 狗 貓 魚 足 牙 毛 皮 心 身 頭 眼 紅 黃

色 到 坐 站 跑 玩 找 拿 放 洗 穿 書 車 門 床 包 衣 果 菜 飯 奶 和 很 沒 愛

Förenklade:

们 自 己 父 母 儿 家 名 字 文 左 右 前 后 里 外 东 西 南 北 百 千 两 个 本

分 午 晚 时 间 雨 风 花 草 林 河 海 狗 猫 鱼 足 牙 毛 皮 心 身 头 眼 红 黄

色 到 坐 站 跑 玩 找 拿 放 洗 穿 书 车 门 床 包 衣 果 菜 饭 奶 和 很 没 爱

## Nivå 4: 100 nya tecken

Traditionella:

雪 雲 樹 葉 星 春 夏 秋 冬 馬 鳥 兔 雞 豬 長 短 高 低 快 慢 冷 熱 新 舊 黑

藍 綠 方 光 亮 會 能 想 知 都 再 就 每 從 給 做 帶 買 送 幫 說 聽 讀 寫 問

答 學 校 老 師 朋 課 習 語 話 樂 歌 畫 笑 哭 睡 醒 謝 請 對 起 歡 讓 等 開

關 進 路 店 桌 椅 窗 筆 紙 杯 碗 刀 叉 肉 蛋 茶 湯 糖 麵 喝 誰 跳 同 生 體

Förenklade:

雪 云 树 叶 星 春 夏 秋 冬 马 鸟 兔 鸡 猪 长 短 高 低 快 慢 冷 热 新 旧 黑

蓝 绿 方 光 亮 会 能 想 知 都 再 就 每 从 给 做 带 买 送 帮 说 听 读 写 问

答 学 校 老 师 朋 课 习 语 话 乐 歌 画 笑 哭 睡 醒 谢 请 对 起 欢 让 等 开

关 进 路 店 桌 椅 窗 笔 纸 杯 碗 刀 叉 肉 蛋 茶 汤 糖 面 喝 谁 跳 同 生 体
