const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3001, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch(e) { reject(new Error(buf)); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── SET 1: Household & Furniture (15 words) ──
const household = [
  { front: 'Chair', back: '**Стул** (stool)\n\nPronunciation: STOOL\n\n"Сядь на стул" — Sit on the chair', tags: ['household', 'furniture'] },
  { front: 'Sofa / Couch', back: '**Диван** (divan)\n\nPronunciation: dee-VAHN\n\n"Сядь на диван" — Sit on the sofa', tags: ['household', 'furniture'] },
  { front: 'Table', back: '**Стол** (stol)\n\nPronunciation: STOL\n\n"Сядь за стол" — Sit at the table', tags: ['household', 'furniture'] },
  { front: 'Bed', back: '**Кровать** (krovat\')\n\nPronunciation: krah-VAHT\n\n"Иди в кровать" — Go to bed', tags: ['household', 'furniture'] },
  { front: 'Door', back: '**Дверь** (dver\')\n\nPronunciation: DVEHR\n\n"Закрой дверь" — Close the door', tags: ['household'] },
  { front: 'Window', back: '**Окно** (okno)\n\nPronunciation: ahk-NOH\n\n"Открой окно" — Open the window', tags: ['household'] },
  { front: 'Floor', back: '**Пол** (pol)\n\nPronunciation: POHL\n\n"Не сиди на полу" — Don\'t sit on the floor', tags: ['household'] },
  { front: 'Light', back: '**Свет** (svet)\n\nPronunciation: SVYET\n\n"Включи свет" — Turn on the light', tags: ['household'] },
  { front: 'Blanket', back: '**Одеяло** (odeyalo)\n\nPronunciation: ah-deh-YAH-lah\n\n"Накройся одеялом" — Cover yourself with a blanket', tags: ['household', 'bedtime'] },
  { front: 'Pillow', back: '**Подушка** (podushka)\n\nPronunciation: pah-DOOSH-kah\n\n"Положи голову на подушку" — Put your head on the pillow', tags: ['household', 'bedtime'] },
  { front: 'Toy', back: '**Игрушка** (igrushka)\n\nPronunciation: ee-GROOSH-kah\n\n"Убери игрушки" — Put away the toys', tags: ['household', 'play'] },
  { front: 'Book', back: '**Книга** (kniga)\n\nPronunciation: KNEE-gah\n\n"Давай почитаем книгу" — Let\'s read a book', tags: ['household', 'play'] },
  { front: 'Shoes', back: '**Ботинки** (botinki) / **Обувь** (obuv\')\n\nPronunciation: bah-TEEN-kee / OH-boov\n\n"Надень ботинки" — Put on your shoes', tags: ['household', 'clothing'] },
  { front: 'Jacket / Coat', back: '**Куртка** (kurtka)\n\nPronunciation: KOORT-kah\n\n"Надень куртку" — Put on your jacket', tags: ['household', 'clothing'] },
  { front: 'Key', back: '**Ключ** (klyuch)\n\nPronunciation: KLYOOCH\n\n"Где ключ?" — Where is the key?', tags: ['household'] },
];

// ── SET 2: Kitchen & Eating (20 words) ──
const kitchen = [
  { front: 'Knife', back: '**Нож** (nozh)\n\nPronunciation: NOSH\n\n"Не трогай нож!" — Don\'t touch the knife!', tags: ['kitchen', 'utensils'] },
  { front: 'Fork', back: '**Вилка** (vilka)\n\nPronunciation: VEEL-kah\n\n"Ешь вилкой" — Eat with a fork', tags: ['kitchen', 'utensils'] },
  { front: 'Spoon', back: '**Ложка** (lozhka)\n\nPronunciation: LOSH-kah\n\n"Ешь ложкой" — Eat with a spoon', tags: ['kitchen', 'utensils'] },
  { front: 'Bowl', back: '**Миска** (miska) / **Тарелка** (tarelka — deep plate)\n\nPronunciation: MEES-kah / tah-REL-kah\n\n"Суп в миске" — The soup is in the bowl', tags: ['kitchen', 'dishes'] },
  { front: 'Plate', back: '**Тарелка** (tarelka)\n\nPronunciation: tah-REL-kah\n\n"Положи на тарелку" — Put it on the plate', tags: ['kitchen', 'dishes'] },
  { front: 'Cup / Mug', back: '**Чашка** (chashka) / **Кружка** (kruzhka — mug)\n\nPronunciation: CHAHSH-kah / KROOSH-kah\n\n"Дай мне чашку" — Give me a cup', tags: ['kitchen', 'dishes'] },
  { front: 'Glass (for drinking)', back: '**Стакан** (stakan)\n\nPronunciation: stah-KAHN\n\n"Стакан воды" — A glass of water', tags: ['kitchen', 'dishes'] },
  { front: 'Water', back: '**Вода** (voda)\n\nPronunciation: vah-DAH\n\n"Хочешь воды?" — Do you want water?', tags: ['kitchen', 'drinks'] },
  { front: 'Milk', back: '**Молоко** (moloko)\n\nPronunciation: mah-lah-KOH\n\n"Хочешь молоко?" — Do you want milk?', tags: ['kitchen', 'drinks'] },
  { front: 'Juice', back: '**Сок** (sok)\n\nPronunciation: SOHK\n\n"Яблочный сок" — Apple juice', tags: ['kitchen', 'drinks'] },
  { front: 'Bread', back: '**Хлеб** (khleb)\n\nPronunciation: KHLEB\n\n"Хочешь хлеб?" — Do you want bread?', tags: ['kitchen', 'food'] },
  { front: 'Cheese', back: '**Сыр** (syr)\n\nPronunciation: SIR\n\n"Бутерброд с сыром" — A sandwich with cheese', tags: ['kitchen', 'food'] },
  { front: 'Egg', back: '**Яйцо** (yaytso)\n\nPronunciation: yai-TSOH\n\nPlural: **яйца** (YAI-tsah)\n"Хочешь яйцо?" — Do you want an egg?', tags: ['kitchen', 'food'] },
  { front: 'Chicken (meat)', back: '**Курица** (kuritsa)\n\nPronunciation: KOO-ree-tsah\n\n"Курица с рисом" — Chicken with rice', tags: ['kitchen', 'food'] },
  { front: 'Rice', back: '**Рис** (ris)\n\nPronunciation: REES\n\n"Хочешь рис?" — Do you want rice?', tags: ['kitchen', 'food'] },
  { front: 'Soup', back: '**Суп** (sup)\n\nPronunciation: SOOP\n\n"Суп горячий" — The soup is hot', tags: ['kitchen', 'food'] },
  { front: 'Cookie', back: '**Печенье** (pechen\'ye)\n\nPronunciation: peh-CHEN-yeh\n\n"Хочешь печенье?" — Do you want a cookie?', tags: ['kitchen', 'food', 'snacks'] },
  { front: 'Candy', back: '**Конфета** (konfeta)\n\nPronunciation: kahn-FYE-tah\n\n"Одну конфету" — One candy', tags: ['kitchen', 'food', 'snacks'] },
  { front: 'Sink', back: '**Раковина** (rakovina)\n\nPronunciation: RAH-kah-vee-nah\n\n"Помой руки в раковине" — Wash your hands in the sink', tags: ['kitchen', 'bathroom'] },
  { front: 'Food', back: '**Еда** (yeda)\n\nPronunciation: ye-DAH\n\n"Еда готова!" — The food is ready!', tags: ['kitchen', 'food'] },
];

// ── SET 3: Fruits & Snacks (10 words) ──
const fruits = [
  { front: 'Strawberry', back: '**Клубника** (klubnika)\n\nPronunciation: kloob-NEE-kah\n\n"Хочешь клубнику?" — Do you want a strawberry?', tags: ['food', 'fruit'] },
  { front: 'Blackberry', back: '**Ежевика** (yezhevika)\n\nPronunciation: yeh-zheh-VEE-kah\n\n"Вкусная ежевика" — Delicious blackberry', tags: ['food', 'fruit'] },
  { front: 'Apple', back: '**Яблоко** (yabloko)\n\nPronunciation: YAH-blah-kah\n\n"Хочешь яблоко?" — Do you want an apple?', tags: ['food', 'fruit'] },
  { front: 'Banana', back: '**Банан** (banan)\n\nPronunciation: bah-NAHN\n\n"Хочешь банан?" — Do you want a banana?', tags: ['food', 'fruit'] },
  { front: 'Grapes', back: '**Виноград** (vinograd)\n\nPronunciation: vee-nah-GRAHD\n\n"Хочешь виноград?" — Do you want grapes?', tags: ['food', 'fruit'] },
  { front: 'Watermelon', back: '**Арбуз** (arbuz)\n\nPronunciation: ar-BOOZ\n\n"Сладкий арбуз!" — Sweet watermelon!', tags: ['food', 'fruit'] },
  { front: 'Orange', back: '**Апельсин** (apel\'sin)\n\nPronunciation: ah-pel-SEEN\n\n"Почисти апельсин" — Peel the orange', tags: ['food', 'fruit'] },
  { front: 'Blueberry', back: '**Черника** (chernika)\n\nPronunciation: cher-NEE-kah\n\n"Черника вкусная" — Blueberries are tasty', tags: ['food', 'fruit'] },
  { front: 'Carrot', back: '**Морковь** (morkov\')\n\nPronunciation: mar-KOHV\n\n"Ешь морковь" — Eat your carrot', tags: ['food', 'vegetable'] },
  { front: 'Potato', back: '**Картошка** (kartoshka)\n\nPronunciation: kar-TOSH-kah\n\n"Картошка с маслом" — Potato with butter', tags: ['food', 'vegetable'] },
];

// ── SET 4: Bathroom & Body (10 words) ──
const bathroom = [
  { front: 'Shower', back: '**Душ** (dush)\n\nPronunciation: DOOSH\n\n"Пора в душ" — Time for a shower', tags: ['bathroom', 'hygiene'] },
  { front: 'Bathtub / Bath', back: '**Ванна** (vanna)\n\nPronunciation: VAHN-nah\n\n"Давай примем ванну" — Let\'s take a bath', tags: ['bathroom', 'hygiene'] },
  { front: 'Toilet / Potty', back: '**Туалет** (tualet) / **Горшок** (gorshok — potty)\n\nPronunciation: too-ah-LET / gar-SHOK\n\n"Тебе нужен горшок?" — Do you need the potty?', tags: ['bathroom', 'potty'] },
  { front: 'Soap', back: '**Мыло** (mylo)\n\nPronunciation: MIH-lah\n\n"Помой руки с мылом" — Wash your hands with soap', tags: ['bathroom', 'hygiene'] },
  { front: 'Towel', back: '**Полотенце** (polotentse)\n\nPronunciation: pah-lah-TEN-tseh\n\n"Вытрись полотенцем" — Dry off with a towel', tags: ['bathroom', 'hygiene'] },
  { front: 'Teeth', back: '**Зубы** (zuby)\n\nPronunciation: ZOO-bih\n\n"Почисти зубы" — Brush your teeth', tags: ['bathroom', 'body'] },
  { front: 'Hands', back: '**Руки** (ruki)\n\nPronunciation: ROO-kee\n\nSingular: **рука** (roo-KAH)\n"Помой руки" — Wash your hands', tags: ['body'] },
  { front: 'Head', back: '**Голова** (golova)\n\nPronunciation: gah-lah-VAH\n\n"У тебя голова болит?" — Does your head hurt?', tags: ['body'] },
  { front: 'Tummy / Belly', back: '**Живот** (zhivot) / **Животик** (zhivotik — tummy, child-friendly)\n\nPronunciation: zhee-VOHT / zhee-VOH-teek\n\n"Животик болит?" — Does your tummy hurt?', tags: ['body'] },
  { front: 'Eyes', back: '**Глаза** (glaza)\n\nPronunciation: glah-ZAH\n\nSingular: **глаз** (GLAHS)\n"Закрой глаза" — Close your eyes', tags: ['body'] },
];

// ── SET 5: Family & People (10 words) ──
const family = [
  { front: 'Mom / Mommy', back: '**Мама** (mama)\n\nPronunciation: MAH-mah\n\n"Мама, иди сюда!" — Mom, come here!', tags: ['family'] },
  { front: 'Dad / Daddy', back: '**Папа** (papa)\n\nPronunciation: PAH-pah\n\n"Папа дома" — Dad is home', tags: ['family'] },
  { front: 'Daughter', back: '**Дочь** (doch\') / **Дочка** (dochka — informal)\n\nPronunciation: DOHCH / DOHCH-kah\n\n"Моя дочка" — My daughter', tags: ['family'] },
  { front: 'Son', back: '**Сын** (syn)\n\nPronunciation: SIN\n\n"Мой сын" — My son', tags: ['family'] },
  { front: 'Sister', back: '**Сестра** (sestra)\n\nPronunciation: ses-TRAH\n\n"Моя сестра" — My sister', tags: ['family'] },
  { front: 'Brother', back: '**Брат** (brat)\n\nPronunciation: BRAHT\n\n"Мой брат" — My brother', tags: ['family'] },
  { front: 'Grandmother / Grandma', back: '**Бабушка** (babushka)\n\nPronunciation: BAH-boosh-kah\n\n"Бабушка придёт" — Grandma is coming', tags: ['family'] },
  { front: 'Grandfather / Grandpa', back: '**Дедушка** (dedushka)\n\nPronunciation: DEH-doosh-kah\n\n"Дедушка дома" — Grandpa is home', tags: ['family'] },
  { front: 'Dog', back: '**Собака** (sobaka)\n\nPronunciation: sah-BAH-kah\n\n"Хорошая собака!" — Good dog!\n"Собачка" (sah-BAHCH-kah) — doggy (child-friendly)', tags: ['family', 'animals'] },
  { front: 'Cat', back: '**Кошка** (koshka) / **Кот** (kot — male cat)\n\nPronunciation: KOSH-kah / KOHT\n\n"Кошка спит" — The cat is sleeping', tags: ['family', 'animals'] },
];

// ── SET 6: Basic Adjectives & Concepts (15 words) ──
const adjectives = [
  { front: 'Cold', back: '**Холодно** (kholodno — it\'s cold, weather/room)\n**Холодный** (kholodnyy — cold object, masc.)\n\nPronunciation: KHOH-lahd-nah\n\n"На улице холодно" — It\'s cold outside\n"Вода холодная" — The water is cold', tags: ['adjective', 'weather'] },
  { front: 'Hot / Warm', back: '**Горячий** (goryachiy — hot, objects)\n**Жарко** (zharko — it\'s hot, weather)\n**Тёплый** (tyoplyy — warm)\n\nPronunciation: gah-RYA-chee / ZHAR-kah / TYOP-liy\n\n"Суп горячий!" — The soup is hot!\n"Сегодня жарко" — It\'s hot today', tags: ['adjective', 'weather'] },
  { front: 'Big', back: '**Большой** (bol\'shoy)\n\nPronunciation: bal-SHOY\n\n"Большая собака" — Big dog (feminine)\n"Большой дом" — Big house (masculine)', tags: ['adjective', 'size'] },
  { front: 'Small / Little', back: '**Маленький** (malen\'kiy)\n\nPronunciation: MAH-len-kee\n\n"Маленькая девочка" — Little girl\n"Маленький мальчик" — Little boy', tags: ['adjective', 'size'] },
  { front: 'Good', back: '**Хороший** (khoroshiy) / **Хорошо** (khorosho — well, fine)\n\nPronunciation: hah-ROH-shee / hah-rah-SHOH\n\n"Хорошая девочка!" — Good girl!\n"Всё хорошо" — Everything is fine', tags: ['adjective'] },
  { front: 'Bad', back: '**Плохой** (plokhoy) / **Плохо** (plokho — badly)\n\nPronunciation: plah-HOY / PLOH-hah\n\n"Это плохо" — That\'s bad', tags: ['adjective'] },
  { front: 'Beautiful / Pretty', back: '**Красивый** (krasivyy, masc.) / **Красивая** (krasivaya, fem.)\n\nPronunciation: krah-SEE-vih\n\n"Красивая бабочка!" — Pretty butterfly!', tags: ['adjective'] },
  { front: 'Tired', back: '**Усталый** (ustalyy, masc.) / **Усталая** (ustalaya, fem.)\n**Устал** (ustal — I\'m tired, masc.) / **Устала** (ustala — fem.)\n\nPronunciation: oo-STAHL / oo-STAH-lah\n\n"Я устал" — I\'m tired (dad)\n"Я устала" — I\'m tired (mom)\n"Она устала" — She is tired', tags: ['adjective', 'feeling'] },
  { front: 'Hungry', back: '**Голодный** (golodnyy, masc.) / **Голодная** (golodnaya, fem.)\n\nPronunciation: gah-LOHD-nih\n\n"Ты голодная?" — Are you hungry? (to daughter)\n"Я голодный" — I\'m hungry (dad)', tags: ['adjective', 'feeling'] },
  { front: 'Happy', back: '**Счастливый** (schastlivyy) / **Рад** (rad — glad, masc.) / **Рада** (rada — fem.)\n\nPronunciation: shahs-LEE-vih / RAHD / RAH-dah\n\n"Я рад!" — I\'m glad! (dad)\n"Она рада" — She is glad', tags: ['adjective', 'feeling'] },
  { front: 'Sad', back: '**Грустный** (grustnyy, masc.) / **Грустная** (grustnaya, fem.)\n\nPronunciation: GROOST-nih\n\n"Почему ты грустная?" — Why are you sad? (to daughter)', tags: ['adjective', 'feeling'] },
  { front: 'Yes', back: '**Да** (da)\n\nPronunciation: DAH\n\n"Да, хочу!" — Yes, I want it!', tags: ['basic'] },
  { front: 'No', back: '**Нет** (nyet)\n\nPronunciation: NYET\n\n"Нет, спасибо" — No, thank you', tags: ['basic'] },
  { front: 'She', back: '**Она** (ona)\n\nPronunciation: ah-NAH\n\n"Она спит" — She is sleeping\n"Она устала" — She is tired', tags: ['pronoun'] },
  { front: 'He', back: '**Он** (on)\n\nPronunciation: OHN\n\n"Он спит" — He is sleeping\n"Он устал" — He is tired', tags: ['pronoun'] },
];

// ── SET 7: Common Phrases (25 phrases) ──
const phrases = [
  { front: 'Do you need to go potty?', back: '**Тебе нужен горшок?**\n(Teh-BYE NOO-zhen gar-SHOK?)\n\nOr for older kids: **Тебе нужно в туалет?**\n(Teh-BYE NOOZH-nah v too-ah-LET?)', tags: ['phrase', 'potty'] },
  { front: 'Wash your hands!', back: '**Помой руки!**\n(pah-MOY ROO-kee!)\n\nWith soap: **Помой руки с мылом!**\n(pah-MOY ROO-kee s MIH-lahm!)', tags: ['phrase', 'hygiene'] },
  { front: 'Time for dinner!', back: '**Пора ужинать!**\n(pah-RAH OO-zhee-naht!)\n\nOr: **Пора кушать!** — Time to eat!\n(pah-RAH KOO-shaht!)', tags: ['phrase', 'mealtime'] },
  { front: 'Time for breakfast!', back: '**Пора завтракать!**\n(pah-RAH ZAHV-trah-kaht!)', tags: ['phrase', 'mealtime'] },
  { front: 'I am tired (dad saying it)', back: '**Я устал**\n(ya oo-STAHL)\n\nNote: Males say "устал", females say "устала"', tags: ['phrase', 'feeling'] },
  { front: 'I am tired (mom saying it)', back: '**Я устала**\n(ya oo-STAH-lah)\n\nNote: Females say "устала", males say "устал"', tags: ['phrase', 'feeling'] },
  { front: 'She is tired', back: '**Она устала**\n(ah-NAH oo-STAH-lah)\n\nCompare: He is tired = **Он устал** (OHN oo-STAHL)', tags: ['phrase', 'feeling', 'pronoun'] },
  { front: 'Are you hungry?', back: '**Ты хочешь кушать?**\n(TIH KHOH-chesh KOO-shaht?)\n\nLiterally: "Do you want to eat?"\nOr: **Ты голодная?** (to a girl)', tags: ['phrase', 'mealtime'] },
  { front: 'Do you want water?', back: '**Хочешь воды?**\n(KHOH-chesh vah-DIH?)\n\nOr: **Хочешь пить?** — Do you want to drink?\n(KHOH-chesh PEET?)', tags: ['phrase', 'drinks'] },
  { front: 'Good morning!', back: '**Доброе утро!**\n(DOH-brah-yeh OOT-rah!)', tags: ['phrase', 'greeting'] },
  { front: 'Good night!', back: '**Спокойной ночи!**\n(spah-KOY-nay NOH-chee!)\n\nLiterally: "Of a peaceful night"', tags: ['phrase', 'bedtime'] },
  { front: 'Time for bed!', back: '**Пора спать!**\n(pah-RAH SPAHT!)\n\nOr: **Иди спать!** — Go to sleep!\n(ee-DEE SPAHT!)', tags: ['phrase', 'bedtime'] },
  { front: 'Brush your teeth!', back: '**Почисти зубы!**\n(pah-CHEES-tee ZOO-bih!)', tags: ['phrase', 'hygiene'] },
  { front: 'Come here!', back: '**Иди сюда!**\n(ee-DEE syoo-DAH!)\n\nFriendly/gentle: **Иди ко мне!** — Come to me!\n(ee-DEE kah MNYE!)', tags: ['phrase', 'command'] },
  { front: 'Be careful!', back: '**Осторожно!**\n(ah-stah-ROZH-nah!)\n\nVery common with toddlers!', tags: ['phrase', 'safety'] },
  { front: 'Don\'t touch!', back: '**Не трогай!**\n(nye TROH-guy!)', tags: ['phrase', 'safety'] },
  { front: 'I love you', back: '**Я тебя люблю**\n(ya teh-BYA lyoob-LYOO)\n\nResponse: **И я тебя люблю** — I love you too\n(ee ya teh-BYA lyoob-LYOO)', tags: ['phrase', 'love'] },
  { front: 'Please', back: '**Пожалуйста**\n(pah-ZHAHL-stah)\n\nAlso means "you\'re welcome"!\n"Дай, пожалуйста" — Give me, please', tags: ['phrase', 'manners'] },
  { front: 'Thank you', back: '**Спасибо**\n(spah-SEE-bah)\n\n"Спасибо, мама!" — Thank you, mom!', tags: ['phrase', 'manners'] },
  { front: 'Sorry / Excuse me', back: '**Извини** (izvinee — informal)\n(eez-vee-NEE)\n\n"Извини, я не хотел(а)" — Sorry, I didn\'t mean to', tags: ['phrase', 'manners'] },
  { front: 'Let\'s go!', back: '**Пойдём!** / **Пошли!**\n(pay-DYOM! / pahsh-LEE!)\n\n"Пойдём гулять!" — Let\'s go for a walk!', tags: ['phrase', 'command'] },
  { front: 'What is this?', back: '**Что это?**\n(SHTO EH-tah?)\n\nGreat for teaching new words together!', tags: ['phrase', 'learning'] },
  { front: 'Where is...?', back: '**Где...?**\n(GDYE...?)\n\n"Где папа?" — Where is daddy?\n"Где мишка?" — Where is the teddy bear?', tags: ['phrase', 'question'] },
  { front: 'Well done! / Good job!', back: '**Молодец!**\n(mah-lah-DYETS!)\n\nThe go-to word for praising a child in Russian.\n"Молодец, дочка!" — Good job, daughter!', tags: ['phrase', 'praise'] },
  { front: 'Give me a hug', back: '**Обними меня**\n(ahb-nee-MEE meh-NYA)\n\nOr: **Давай обнимемся** — Let\'s hug\n(dah-VYE ahb-NEE-mem-sya)', tags: ['phrase', 'love'] },
];

async function main() {
  const topic = await post('/api/topics', {
    name: 'Русский — Russian for Beginners',
    description: 'Learn Russian with your daughter! Everyday household words, food, family, body parts, feelings, and common toddler/family phrases. Includes pronunciation guides.',
    color: '#dc2626',
    icon: 'book'
  });
  console.log('Created topic:', topic.id, topic.name);

  const sets = [
    { name: '1. Home & Furniture', desc: 'Chair, table, bed, door, window, toys, clothing — things around the house.', cards: household },
    { name: '2. Kitchen & Eating', desc: 'Utensils, dishes, drinks, and common foods. The words you use at every meal.', cards: kitchen },
    { name: '3. Fruits & Vegetables', desc: 'Strawberry, apple, banana, grapes, carrots, potatoes — produce vocabulary.', cards: fruits },
    { name: '4. Bathroom & Body', desc: 'Bath time, potty, soap, towel, body parts — daily hygiene routine words.', cards: bathroom },
    { name: '5. Family & Animals', desc: 'Mom, Dad, daughter, grandparents, brother, sister, dog, cat — your people.', cards: family },
    { name: '6. Adjectives & Basics', desc: 'Hot, cold, big, small, good, bad, tired, hungry, happy, sad, yes, no, he/she.', cards: adjectives },
    { name: '7. Everyday Phrases', desc: '25 phrases for potty time, meals, bedtime, manners, praise, and love.', cards: phrases },
  ];

  let total = 0;
  for (const s of sets) {
    const cardSet = await post('/api/topics/' + topic.id + '/sets', { name: s.name, description: s.desc });
    console.log('Created set:', s.name, `(${s.cards.length} cards)`);
    for (const c of s.cards) {
      await post('/api/sets/' + cardSet.id + '/cards', {
        tags: c.tags,
        front: { media_blocks: [{ block_type: 'text', text_content: c.front }] },
        back: { media_blocks: [{ block_type: 'text', text_content: c.back }] }
      });
      total++;
    }
  }

  console.log(`\nDone! Created ${total} flashcards across ${sets.length} sets in "Русский — Russian for Beginners"`);
}

main().catch(e => console.error('Error:', e));
