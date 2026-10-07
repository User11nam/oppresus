// data.js: all of the written content for the Oppressus simulation.
//
// Edit freely. Positions ("pos", "label") are pixel coordinates on assets/district_map.png
// (2250 x 1955): open the image in Paint and the bottom bar shows the pixel under your mouse.
// Entries marked `invented: true` were made up for the simulation and are not in the source files.

window.DATA = {

  meta: {
    title: 'Oppressus',
    tagline: 'A Simulation of a Post-Ice Antarctic Civilization',
    capitalCity: 'Nova Cella',
    // The Oppressan calendar counts from Dies Creationis, the day Cilla entered the first vessel.
    calendar: { name: 'Anno Cillae', abbr: 'AC', yearOneCE: 2207 },
    presentYearAC: 312,
  },

  // ------------------------------------------------------------------ SOCIETY (from oppressus.md)
  society: {
    // The social pyramid, top to bottom
    classes: [
      { id: 'leader', name: 'Supreme Leader', description: 'The vessel of the god Cilla, and the title Cilla itself. Chooses the Supreme Advisors and the next Supreme Leader. He may not have children, because he is god and everyone is a child of god.' },
      { id: 'advisor', name: 'Supreme Advisors', description: 'Give advice to the Supreme Leader and are a listening ear for him. There are only ever 8 Supreme Advisors, and they are equal in rank to the District Rulers. Advisors can raise the status of others: any single classman can become a Dual Classman.' },
      { id: 'ruler', name: 'District Rulers', description: 'Command areas of land. They control their sections while still listening to what the Supreme Leader says.' },
      { id: 'dual', name: 'Dual Classmen', description: 'People with two specific jobs, each of which they can do at the level of a normal classman.' },
      { id: 'sailsman', name: 'Sailsmen', description: 'People who trade goods. Classmen specialize in a trade; sailsmen sell things.' },
      { id: 'classman', name: 'Classmen', description: 'The working class. Most of the work is done by classmen, and everyone is expected to specialize in one specific field.' },
    ],

    // Share of each district's people in each class (the rest are Classmen). Invented for the simulation.
    classProfiles: {
      capital: { dual: 0.07, sailsman: 0.22 }, corton_sea: { dual: 0.05, sailsman: 0.12 }, malum_rec: { dual: 0.04, sailsman: 0.10 },
      solum: { dual: 0.04, sailsman: 0.08 }, sovalus: { dual: 0.06, sailsman: 0.04 }, planities: { dual: 0.05, sailsman: 0.02 },
      apricus: { dual: 0.05, sailsman: 0.02 }, veskan_sea: { dual: 0.09, sailsman: 0.01 }, incarcer: { dual: 0.03, sailsman: 0.005 },
      mount_veston: { dual: 0, sailsman: 0 }, cura_aliud: { dual: 0, sailsman: 0 }, nullus_sol: { dual: 0, sailsman: 0, outlaw: 1 },
    },

    // The 8 Supreme Advisors (names invented). `seat` is where each one usually is.
    advisors: [
      { name: 'Octavia Brennan', origin: 'Irish', seat: 'nova_cella', since: 289 },
      { name: 'Lucius Mwangi', origin: 'Swahili', seat: 'nova_cella', since: 294 },
      { name: 'Valeria Novak', origin: 'Czech', seat: 'nova_cella', since: 297 },
      { name: 'Gaius Park', origin: 'Korean', seat: 'nova_cella', since: 301 },
      { name: 'Livia Duarte', origin: 'Portuguese', seat: 'nova_cella', since: 305 },
      { name: 'Septimus Rao', origin: 'Telugu', seat: 'nova_cella', since: 309 },
      { name: 'Aurelia Volkova', origin: 'Russian', seat: 'vesca', since: 298 },
      { name: 'Felix Haddad', origin: 'Arabic', seat: 'incarcer_town', since: 303 },
    ],

    // Background topics shown in the info panels
    topics: {
      government: { title: 'Government', text: 'Oppressus is a theocracy. Its ruler carries the title Cilla and is believed to be the vessel of the god Cilla. Each leader is chosen by the one before: Cilla first inhabited the first leader, and passes on to each following leader. The Supreme Leader tells the District Rulers what to do, and stops, aids or runs wars and political disagreements.' },
      classes: { title: 'Social classes', text: 'From top to bottom: the Supreme Leader; the 8 Supreme Advisors and the District Rulers, who are equal in rank; Dual Classmen, who have two jobs; Sailsmen, who trade goods; and Classmen, the working class, who each specialize in one field.' },
      mobility: { title: 'Changing class', text: 'Supreme Advisors can raise the status of others, and any single classman can become a Dual Classman. The Supreme Leader chooses the Supreme Advisors and the next Supreme Leader. Technically anyone can become Supreme Leader, but by custom he picks one of his advisors.' },
      laws: { title: 'The laws', list: ['Do not murder', 'Do not assault people', 'Do not steal', 'Do not attack wildlife', 'Keep out of the Royal Zones (areas that need government permission)'] },
      justice: { title: 'Justice', text: 'There is no death penalty, and physical harm such as beatings is not allowed. Jails are harsh, with strict food, but long-term jails are like Sweden\'s prison system and are based on rehabilitation. Murder and rape are punished with long-term white room torture. Minor stealing and vandalism usually bring just a charge. Charges come in three levels, Primus, Quintis and Decimus (1, 5 and 10, or I, V and X), each with a different level of punishment.' },
      military: { title: 'The military', text: 'Joining the military is a choice, but at the start of every war it becomes a draft for everyone aged 20 to 21. Enlistment is in 3-year periods, and most soldiers re-enlist by choice because of the many military benefits. After leaving, a soldier can be called back any day within 9 years.' },
      religion: { title: 'Religion', text: 'Oppressans worship one god, Cilla, who represents everything. Everything comes from cells: cella is Latin for "cell," and Cilla is another way of saying cella. The Supreme Leader is Cilla\'s vessel. People show respect by giving 1% of all wealth to Cilla, and by keeping a candle in their homes at all times to represent Cilla\'s gift of fire.' },
      holiday: { title: 'Dies Creationis', text: 'The most important holiday. Dies Creationis is Latin for "day of creation," and it marks the day Cilla inhabited the first vessel. It is celebrated every year and begins the Oppressan calendar.' },
      language: { title: 'Language', text: 'Mainly Latin. English and Russian are widely spoken second languages, and most other languages are spoken to some degree. Writing uses Latin letters and the standard digits 1, 2, 3, 4, 5, 6, 7, 8, 9 and 0.' },
      currency: { title: 'Money', text: 'Paper notes marked with a copper stamp, in five values: Unus (1), Quinque (5), Decem (10), Viginti (20) and Centum (100). U.S. dollars and Russian rubles can be traded at local treasuries, and digital money on debit cards is also very common.' },
      economy: { title: 'The economy', text: 'Four things drive the economy: trade in oil within the country, the mineral trade, the need to buy most of its wood, and the industrial recycling of CO2 into carbon products. Above all there is copper, a lot of copper, which is the main export.', note: 'With the old oil fields gone, the oil traded inside Oppressus is synthetic fuel made from recycled CO2 (this is the simulation\'s explanation).' },
      royalZones: { title: 'Royal Zones', text: 'Areas that can only be entered with government permission: all of Mount Veston, the naval training grounds of the Veskan Sea (ordinary people may visit only on tours), and the emperor\'s house in Nova Cella.' },
      defense: { title: 'Natural defenses', text: 'Oppressus has an extensive mountainous coastline. The whole country is essentially one huge island owned by a single people, so it can be watched with no real blind spots.' },
    },
    // which topics appear for each district and each kind of place
    relevantTopics: {
      capital: ['government', 'classes', 'currency'], mount_veston: ['religion', 'holiday', 'royalZones'], veskan_sea: ['military', 'royalZones', 'defense'],
      incarcer: ['justice', 'laws'], nullus_sol: ['justice'], malum_rec: ['laws', 'justice'], apricus: ['laws', 'economy'], planities: ['economy'],
      sovalus: ['economy', 'currency'], corton_sea: ['economy', 'currency'], solum: ['economy'], cura_aliud: ['religion'],
      sacred: ['religion', 'holiday'], palace: ['government', 'mobility', 'royalZones'], prison: ['justice'], rehab: ['justice'], military: ['military'],
      treasury: ['currency'], carbon: ['economy'], mine: ['economy'], port: ['economy', 'currency'], timber: ['economy'], market: ['laws'],
    },
  },

  // The Supreme Leaders so far. Each takes the title Cilla. (Names and dates invented; the Phase 5 lineage view builds on this.)
  succession: [
    { name: 'Kirill Aurelian', origin: 'Russian', from: 1, to: 34, chosenBy: 'Cilla, in the cave on Mount Veston', advisor: false, note: 'The man in the cave. He claimed Cilla had entered his body and founded Oppressus.' },
    { name: 'Marcus Hale', origin: 'English', from: 34, to: 61, advisor: true },
    { name: 'Tobias Lindgren', origin: 'Swedish', from: 61, to: 83, advisor: true },
    { name: 'Dmitri Corvus', origin: 'Russian', from: 83, to: 112, advisor: true },
    { name: 'Rafael Quintana', origin: 'Spanish', from: 112, to: 130, advisor: false, note: 'A classman, not an advisor: the first time a Supreme Leader broke the custom.' },
    { name: 'Hideo Varro', origin: 'Japanese', from: 130, to: 157, advisor: true },
    { name: 'Samuel Achterberg', origin: 'Dutch', from: 157, to: 188, advisor: true },
    { name: 'Cassian Mbeki', origin: 'Xhosa', from: 188, to: 219, advisor: true },
    { name: 'Pavel Severin', origin: 'Russian', from: 219, to: 251, advisor: true },
    { name: 'Idris Calloway', origin: 'Welsh', from: 251, to: 284, advisor: true },
    { name: 'Lucan Ferro', origin: 'Italian', from: 284, to: null, advisor: true },
  ],

  // ------------------------------------------------------------------ STORIES (Fabulae)
  // Every piece of lore and folklore from districts.md and oppressus.md, retold for the storybook map.
  // `source` is the original line from your files. `at` is a place id (or [x, y] on the map image).
  // `year` (CE) puts the story on the Historia timeline too. `cilla`: flame | cell | both (copper icons).
  // type: religious | holiday | custom | legend | ghost | mystery | rumor | saying | origin | cautionary
  stories: [
    {
      id: 'man_in_the_cave', title: 'The Man in the Cave', district: 'mount_veston', type: 'religious', cilla: 'both', at: 'cilla_cave', year: 2207,
      text: 'Long ago, when the ice had only just left the land, a man climbed high onto Mount Veston and found a cave. When he came down, he said that the god Cilla had entered his body and now lived inside him. He told the people that Cilla had come to rule the land, and so many believed him that they gathered around him and became one people: Oppressus. He was the first vessel of Cilla, and that day became the first day of the Oppressan calendar.',
      source: 'A man claimed to find a cave and convinced a bunch of people his body was inhabited by god to rule the arctic.', sourceFile: 'oppressus.md',
    },
    {
      id: 'dies_creationis', title: 'Dies Creationis, the Day of Creation', district: 'mount_veston', type: 'holiday', cilla: 'flame', at: 'cilla_cave', year: 2208,
      text: 'Every year Oppressans celebrate Dies Creationis, which means "day of creation" in Latin. It remembers the day Cilla first entered a human vessel in the cave on Mount Veston. No one but the guards may climb the sacred mountain, so the people celebrate in their own towns and homes, all across the land.',
      source: 'Dies-Creationis, Latin for day of creation, represents the day Cilla inhabited the first creationest.', sourceFile: 'oppressus.md',
    },
    {
      id: 'best_kept_secret', title: 'The Best-Kept Secret', district: 'mount_veston', type: 'legend', at: 'cilla_cave',
      text: 'No one is allowed on Mount Veston, not even to look for the cave. The whole mountain is guarded as the country\'s best-kept secret. Only five people live there, and they are guards for life. Down in the valleys, people wonder what the five guards have seen, and what it is like to keep watch over the place where Cilla first came into the world.',
      source: 'Nobody is permitted to go here. Cilla\'s cave is located here, it is guarded as the society\'s best kept secret... Population is about 5 and they are all lifelong guards.', sourceFile: 'districts.md',
    },
    {
      id: 'gift_of_fire', title: 'The Gift of Fire', district: 'capital', type: 'custom', cilla: 'flame', at: 'capital_8', year: 2208,
      text: 'In every Oppressan home, a candle burns at all times. The candle stands for Cilla\'s gift of fire. In a land as cold and windy as this one, fire is what makes life possible, and so the little flame in each home is a way of saying thank you to Cilla, every hour of every day.',
      source: 'People are also expected to have a candle in their homes at all times; This is to represent Cilla\'s giving of fire.', sourceFile: 'oppressus.md',
    },
    {
      id: 'everything_from_cells', title: 'Everything Comes from Cells', district: 'capital', type: 'religious', cilla: 'cell', at: 'domus_cillae',
      text: 'Why is the god called Cilla? Oppressans teach that everything that lives is made of cells, and so everything comes from cells. In Latin a cell is "cella," and Cilla is another way of saying cella. That is why Cilla is not just one thing in the world: Cilla represents everything.',
      source: 'The god itself is just called "cilla" as it represents everything. And everything comes from cells (cella is latin for cell, Cilla is another way of saying cella).', sourceFile: 'oppressus.md',
    },
    {
      id: 'passing_of_cilla', title: 'The Passing of Cilla', district: 'capital', type: 'religious', cilla: 'both', at: 'domus_cillae', year: 2240,
      text: 'A vessel of Cilla may not have children, because he is god and everyone is his child. So when a vessel\'s time is ending, he chooses who will carry Cilla next, and Cilla passes from one body to the next. By custom he chooses one of his Supreme Advisors, though anyone at all could be chosen. Cilla first passed on in Year 34 AC, from Kirill Aurelian to Marcus Hale.',
      source: 'Chosen by previous leader, first leader was inhabited by Cilla (god), says that Cilla passes to the following leader. ... Supreme leader is not allowed to have children as he is god and everyone is a child of god.', sourceFile: 'oppressus.md',
    },
    {
      id: 'fallen_towers', title: 'The Fallen Towers', district: 'capital', type: 'mystery', at: 'litus_desertum', year: 2411,
      text: 'The capital never seems to sleep, except in one place. Along the coast of Cura Aliud, the crowded streets of Nova Cella simply stop. There the houses are broken down, skyscrapers lie fallen across the ground, and nobody is in sight. In a city of fourteen million people, no one can quite say why everyone left, and very few go to look.',
      source: 'The only non-bustling part of the city is the coast of Cura Aliud; that place is kinda a ghost town, with broken-down houses, fallen skyscrapers, and nobody in sight.', sourceFile: 'districts.md',
    },
    {
      id: 'never_return', title: 'Those Who Never Return', district: 'cura_aliud', type: 'legend', at: [1100, 640],
      text: 'Ask anyone in Oppressus about Cura Aliud, the dark sea, and they will tell you the same thing: people who go there do not come back. Stories are told of travellers who set out onto its waters and were never seen again. Whether the stories are true or not, nobody wants to be the one to find out.',
      source: 'The "dark" sea, stories are told of people coming here and never coming back.', sourceFile: 'districts.md',
    },
    {
      id: 'voices_from_the_sea', title: 'Voices from the Sea', district: 'cura_aliud', type: 'ghost', at: 'cura_aliud_4',
      text: 'On quiet nights along the empty shores of Cura Aliud, people say you can hear voices coming from the sea. No one knows whose voices they are, or what they are trying to say. The abandoned villages along the coast are reason enough for most people not to stay and listen.',
      source: 'People tell stories of voices coming from the sea.', sourceFile: 'districts.md',
    },
    {
      id: 'shunned_sea', title: 'The Shunned Sea', district: 'cura_aliud', type: 'custom', at: 'cura_aliud_2', year: 2411,
      text: 'Trade never comes through Cura Aliud, and people do not venture to its side of the land. Oppressans treat the dark sea as being as secluded as Mount Veston itself. The places along its coast are often abandoned, left just as they were when the last people walked away.',
      source: 'Trade never comes through this side, people dont venture on this side, and the whole thing is treated as secluded as Mount Veston. Places along the coast are often abandoned.', sourceFile: 'districts.md',
    },
    {
      id: 'strange_soil', title: 'The Strange Soil', district: 'planities', type: 'rumor', at: 'horrea', year: 2224,
      text: 'The plains of Planities grow almost all of Oppressus\'s food, and by rights that should not be possible in such a cold, windy land. Yet the soil is strangely fertile, and nobody knows why. The farmers have a whispered answer of their own: some say it has something to do with Cura Aliud, the dark sea just beyond their fields.',
      source: 'The land here is strangely fertile, and nobody knows why; some say it has something to do with Cura Aliud.', sourceFile: 'districts.md',
    },
    {
      id: 'where_the_sun_hides', title: 'Where the Sun Hides', district: 'malum_rec', type: 'legend', at: 'malum_rec_1',
      text: 'Malum Rec is the darkest place in Oppressus. Trapped between two mountains, it sees the sun for only part of each day, and the rest of the time the valley lies in shadow. In that shadow happen all the things people do not want others to know about, including a massive underground weapons trade.',
      source: 'The darkest area, trapped between two mountains the sun only shines here for part of the day, massive underground weapons trade and anything that people dont want others knowing about happens here.', sourceFile: 'districts.md',
    },
    {
      id: 'no_questions', title: 'The Valley That Asks No Questions', district: 'malum_rec', type: 'saying', at: 'malum_rec_4', year: 2364,
      text: 'People on the run go to Malum Rec. People in trouble go to Malum Rec. People who need protection go to Malum Rec. The government does not stick its nose in, for fear that the valley would rise up in revolt, and so no one even knows how many people live there: somewhere between two and five million.',
      source: 'People on the run stay here, people in trouble stay here, people who need protection stay here, and the government doesnt stick their nose here in fear of a revolt.', sourceFile: 'districts.md',
    },
    {
      id: 'forest_kept_growing', title: 'The Forest That Kept Growing', district: 'apricus', type: 'origin', at: 'apricus_1', year: 2285,
      text: 'Apricus means "sunny" in Latin, and the land was named for its great amount of sunlight. It is also home to a giant forest. Long ago it was decided that no one may harm the wildlife there, and with nothing to stop it, the forest kept on growing. The people did not cut it back. They simply built their towns and houses around it.',
      source: 'Called apricus due to the large amounts of sunlight, also a giant forest. People are not allowed to harm the wildlife here so the forest kept growing.', sourceFile: 'districts.md',
    },
    {
      id: 'loneliest_mountain', title: 'The Loneliest Mountain', district: 'solum', type: 'saying', at: 'mount_solum',
      text: 'Mount Solum is called the loneliest mountain. Only 30 people live on the whole of it, most of them in one small town at its base. Below it, the road of trade is busy with merchants carrying goods from the Corton Sea to the capital, but the mountain itself stays quiet and alone.',
      source: 'Also known as Mount Solum, it is the loneliest mountain, with a population of 30 on the entire mountain, mostly in one small town around the base.', sourceFile: 'districts.md',
    },
    {
      id: 'exiles', title: 'The Exiles of Nullus Sol', district: 'nullus_sol', type: 'cautionary', at: 'campus_olei', year: 2389,
      text: 'Nullus Sol means "no sun," yet it is the one place in Oppressus that is hot and humid. In an ancient field where oil was once mined, about 300 people hide. Oppressans say they are all insane and evil, people who fled there to escape a horrid punishment. Usually nobody goes to Nullus Sol, and it is the kind of place parents warn their children about.',
      source: 'An ancient field where oil used to be mined, hot and humid, often nobody goes here population is around 300, all insane evil people who needed to hide from horrid punishment.', sourceFile: 'districts.md',
    },
    {
      id: 'white_room', title: 'The White Room', district: 'incarcer', type: 'cautionary', at: 'incarculuss', year: 2336,
      text: 'Oppressus has no death penalty, and no one may be beaten as a punishment. Most prisoners in Incarcer live in small homes and are helped to become better people. But close to the edge of Nullus Sol stands Incarculuss, where those who have done the most terrible things are put in the white room. People speak of it quietly, as the punishment that takes the place of death.',
      source: 'One large prison called Incarculuss... it is used as a torture prison, where people are put under white room torture for only the most heinous acts, kinda like a replacement to the death penalty.', sourceFile: 'districts.md',
    },
    {
      id: 'unsafe_water', title: 'The Unsafe Water', district: 'corton_sea', type: 'saying', at: 'aquae_malae',
      text: 'In the fishing villages of the Corton Sea, everyone learns the same rule: stay out of the water near the Nullus Sol coast, because it is unsafe to be in. On the other side of the sea the land is full of life and prosperity, and the friendly villages fish and trade in peace. But no one swims toward Nullus Sol.',
      source: 'The water near the Nullus sol coast is unsafe to be in, but the land on the other side is full of life and prosperity.', sourceFile: 'districts.md',
    },
    {
      id: 'three_years', title: 'Three Years, and Back Again', district: 'veskan_sea', type: 'custom', at: 'castra_1', year: 2258,
      text: 'No one in Oppressus has to be a soldier, unless a war begins: then every 20- and 21-year-old is called up. Those who join the navy on the Veskan islands sign on for three years at a time, and most choose to stay for another three, because the military takes good care of its own. Even after they leave, they can be called back on any day for nine more years.',
      source: 'Joining the military is a choice, but becomes a draft at the start of every war (only for people 20-21)... Enlistment is 3 year periods of time, most reenlist by choice after joining as there are many military benefits.', sourceFile: 'oppressus.md',
    },
    {
      id: 'a_lot_of_copper', title: 'A Lot of Copper', district: 'sovalus', type: 'saying', at: 'sovalus_city', year: 2268,
      text: 'Ask an Oppressan what their country sells to the world, and you will hear one answer, said with a grin: "Copper. A lot of copper." The mining city of Sovalus runs entirely on mining, and its copper is the country\'s main export. Merchants buy the metal from the miners and sell them food from the capital and Planities, and so a trade route was born.',
      source: 'There\'s also copper…. A LOT of copper, so its the main exported good.', sourceFile: 'oppressus.md',
    },

    // ---- myths, creatures and funny records made up for the simulation (not from the source files).
    // `inspiredBy` names the real-world myth a story borrows from. type adds: myth | creature | record
    {
      id: 'breathing_giant', title: 'The Giant Who Breathes', district: 'veskan_sea', type: 'myth', at: [1231, 1240], invented: true,
      inspiredBy: 'Ymir, the frost giant of Norse myth, and Daidarabotchi, the giant of Japanese folklore who shaped the land',
      text: 'Sailors on the Veskan islands say the long mountain island is not a mountain at all. It is the backbone of an ice giant who lay down to sleep when the whole world was frozen, and the ice grew over him like a blanket. When the blanket melted away, the giant began to breathe again, and with every slow breath the land rises a little higher out of the sea. Scientists call it isostatic rebound. The sailors just say, "He is stretching."',
    },
    {
      id: 'fox_of_the_lights', title: 'The Fox of the Southern Lights', district: 'solum', type: 'myth', at: 'solum_hamlet', invented: true,
      inspiredBy: 'Revontulet ("fox fires"), the Finnish legend of a fox whose tail sweeps sparks into the sky to make the northern lights',
      text: 'The six people of Specula, high on Mount Solum, tell of a white fox that runs across the snowfields on the longest winter nights. Its tail is so long that it brushes the snow, and the sparks it flicks into the sky become the green and red curtains of the aurora australis. If you see the lights, they say, the fox has passed close by, so it is polite to leave a little food on the doorstep.',
    },
    {
      id: 'penguin_king', title: 'The Penguin King', district: 'cura_aliud', type: 'myth', at: 'cura_aliud_1', invented: true,
      inspiredBy: 'Animal kings of folklore, such as the Celtic king of the seals; emperor penguins really did vanish in this story\'s timeline around 2084',
      text: 'No one has seen an emperor penguin since the old world melted. And yet the few who have sailed into Cura Aliud and returned swear the same thing: on an island no map shows, a single enormous penguin wearing a crown of ice sits on a throne of black rock. He is the last Penguin King, they say, and he is waiting for the cold to come back.',
    },
    {
      id: 'lamp_licker', title: 'The Lamp-Licker', district: 'capital', type: 'myth', at: 'capital_2', invented: true,
      inspiredBy: 'The abura-akago, a Japanese spirit that sneaks into houses at night to lick the oil from lamps',
      text: 'Every home must keep a candle burning, so every child in Nova Cella knows about the Lamp-Licker: a tiny grey creature, no bigger than a thumb, that creeps out of the walls at night to lick the wax and blow out the flame. That is why a careful family always keeps a spare candle and a box of matches by the bed. Grandmothers say that if you leave the Lamp-Licker one drop of wax of its own on Dies Creationis eve, it will leave your candle alone all year.',
    },
    {
      id: 'hooked_islands', title: 'The Fisherman Who Hooked the Islands', district: 'corton_sea', type: 'myth', at: 'corton_sea_1', invented: true,
      inspiredBy: 'Māui, the Polynesian hero who fished up the North Island of New Zealand with a magic hook',
      text: 'The people of Rybachy say the islands of the Corton Sea were never there at all until a fisherman named Old Corton dropped a hook made from a whale\'s jawbone into the deep water. Something bit, and bit hard. He pulled for three days and three nights, and up came one island, then another, then another, all still hooked together. The bays between the islands, they say, are the marks of his fishing line.',
    },
    {
      id: 'old_fish', title: 'The Great Fish Who Hates Greed', district: 'corton_sea', type: 'creature', at: 'piscatoria', invented: true,
      inspiredBy: 'Tales of greed punished, like the Grimm story "The Fisherman and His Wife"',
      text: 'Somewhere under the Corton Sea swims a fish as long as a fishing boat, with scales like old copper notes. It never bothers honest fishermen. But when a greedy child keeps fishing after catching more than they need, the Great Fish rises, takes the hook in its mouth, and pulls until the fishing rod snaps in two. Parents in Piscatoria have a saying for children who want too much: "Careful, or the Great Fish will take your rod."',
    },
    {
      id: 'veston_snowman', title: 'The Snowman of Mount Veston', district: 'mount_veston', type: 'creature', at: [1291, 289], year: 2474, invented: true,
      inspiredBy: 'The yeti, the "abominable snowman" said to live in the Himalayas',
      text: 'In Year 268 AC, one of the five guards of Mount Veston wrote a strange report: a tall, white, shaggy figure had been seen walking across the high snow, far from the cave. Since nobody is allowed on the mountain, the guard did what the rules required and filed a Primus charge against "one large unknown person, possibly made of snow." The charge was never answered. Footprints the size of dinner plates have been reported three times since.',
    },
    {
      id: 'great_break', title: 'The Great Incarcer Break', district: 'incarcer', type: 'record', at: 'incarcer_1', year: 2360, invented: true,
      text: 'In Year 154 AC, three prisoners from the rehabilitation village of Nova Spes borrowed a wheelbarrow and escaped into the night. They headed for Nullus Sol, where they had heard fugitives could hide. Three days later all three walked back into Nova Spes, sunburned and soaked in sweat, complaining that Nullus Sol was far too hot and humid, and asking what was for dinner. Each was given a Primus charge for stealing the wheelbarrow.',
    },
    {
      id: 'white_wall', title: 'The Winter of the White Wall', district: 'solum', type: 'record', at: 'solum_1', year: 2447, invented: true,
      text: 'In Year 241 AC, a tongue of old ice broke loose from the snowfields of Mount Solum and slid down across the road of trade, leaving a frozen wall taller than a house. For 43 days nothing could pass between the Corton Sea and the capital. Merchants took the long way through Malum Rec, and Nova Cella ran so short of imported timber that people burned old furniture. In the end, engineers piped warm air from the carbon plants to melt a tunnel through the wall.',
    },
    {
      id: 'copper_dust', title: 'The Week the Sky Turned Copper', district: 'sovalus', type: 'record', at: 'sovalus_1', year: 2439, invented: true,
      text: 'In Year 233 AC, a storm tore the roofs off the great sheds of copper ore at Cuprum. For a whole week the wind blew fine copper dust over the mining towns, and everything in Sovalus turned orange: the snow, the streets, the washing on the lines, even the dogs. The children called it "the week the sun came to Sovalus," and the miners still wear a pinch of orange dust on Dies Creationis to remember it.',
    },
    {
      id: 'goose_road', title: 'The Goose Road', district: 'apricus', type: 'record', at: 'silvanum', year: 2482, invented: true,
      text: 'In Year 276 AC, a flock of wild geese built their nests right in the middle of Silvanum\'s main road. Because it is against the law to harm wildlife, nobody could move them. Carts waited, then backed up, then went around through the trees. After a month, the town gave up and built a brand-new road around the nests. The geese still return every spring, and the old road is now a park called the Goose Road, where no human has the right of way.',
    },
    {
      id: 'lost_tour', title: 'The Lost Tour', district: 'veskan_sea', type: 'record', at: 'vesca', year: 2494, invented: true,
      text: 'Ordinary people may only visit the Veskan Sea on guided tours. In Year 288 AC, a group of twelve tourists from Planities took a wrong turn while their guide was counting heads, and walked straight into a full naval training exercise. They were "captured" by a squad of very surprised sailors, given lunch, and returned to their boat with full military honours. All twelve were made honorary sailors, and the tour guide was made to count heads twice for the rest of her career.',
    },
    {
      id: 'giant_turnip', title: 'The Turnip That Fed a Borough', district: 'planities', type: 'record', at: 'planities_1', year: 2386, invented: true,
      inspiredBy: 'The Russian folk tale "The Giant Turnip"',
      text: 'The soil of Planities is strangely fertile, but in Year 180 AC it outdid itself. A farmer in Messis found a turnip so big that it took her whole family, two neighbours, a horse and the town dog to pull it out of the ground. It was sent to Nova Cella as a gift to the Supreme Leader, who had it made into soup for an entire borough. Some say Cura Aliud had something to do with it. Some say it was just a very good year.',
    },
  ],

  // ------------------------------------------------------------------ PRESENTATION MODE
  // The hands-free tour: an introduction, the Historia chapters, Civitas, then a tour of Fabulae stories.
  // Times are in seconds. Space pauses, the arrow keys skip, Esc stops.
  presentation: {
    seconds: { intro: 9, chapter: 13, civitas: 10, family: 10, simulate: 24, story: 11, end: 8 },
    intro: { title: 'Oppressus', text: 'A civilization on an ice-free Antarctica. Imagine that every bit of Antarctica\'s ice has melted, and a new people has made the uncovered land its home.' },
    civitas: [
      { title: 'Twelve districts', text: 'Oppressus is divided into twelve districts. Each one has a District Ruler who answers to the Supreme Leader, the vessel of the god Cilla.', focus: null },
      { title: 'Nova Cella, the capital', text: 'About 14 million people live in the capital, a city that looks like a mix of New York and Beijing. The emperor lives here, with six of his eight Supreme Advisors.', focus: 'capital' },
      { title: 'The succession of Cilla', text: 'Supreme Leaders cannot have children. Each one chooses the next vessel of Cilla, usually one of his advisors.', panel: 'succession' },
      { title: 'A family of Oppressus', text: 'Ordinary families pass down their trades. Some members are raised to Dual Classman by the Supreme Advisors.', panel: 'family', family: 3 },
      { title: 'The trade routes', text: 'Copper flows out through the Corton Sea, food comes from Planities, timber is imported, and the carbon plants make the fuel.', economy: true },
    ],
    simulate: { years: 26, title: 'The years ahead', text: 'Watch the future unfold year by year: the copper boom, the Austral War and its draft, and the beginning of hard times.' },
    stories: ['man_in_the_cave', 'gift_of_fire', 'everything_from_cells', 'fallen_towers', 'voices_from_the_sea', 'strange_soil', 'where_the_sun_hides', 'forest_kept_growing', 'loneliest_mountain', 'white_room', 'exiles', 'unsafe_water', 'veston_snowman', 'old_fish', 'great_break', 'giant_turnip'],
    end: { title: 'Fabulae Oppressi', text: 'The land, its history, its people and its stories. Thank you for listening.' },
  },

  // ------------------------------------------------------------------ CITIZEN FAMILIES (Civitas lineages)
  // Each family's tree is generated from these settings (the same way every time) from its founding
  // up to the present, and keeps growing while the Civitas simulation runs. All names are invented.
  families: {
    list: [
      { surname: 'Mercator', district: 'capital', home: 'nova_cella', trade: 'Merchant', sailsmen: true, founded: 228 },
      { surname: 'Cellarius', district: 'capital', home: 'capital_3', trade: 'Scribe', founded: 231 },
      { surname: 'Candelarius', district: 'capital', home: 'capital_8', trade: 'Candle maker', founded: 236 },
      { surname: 'Agricola', district: 'planities', home: 'horrea', trade: 'Farmer', founded: 226 },
      { surname: 'Cuprius', district: 'sovalus', home: 'sovalus_city', trade: 'Copper miner', founded: 234 },
      { surname: 'Piscator', district: 'corton_sea', home: 'piscatoria', trade: 'Fisher', founded: 229 },
      { surname: 'Lucidius', district: 'apricus', home: 'silvanum', trade: 'Forest warden', founded: 238 },
      { surname: 'Navalis', district: 'veskan_sea', home: 'vesca', trade: 'Naval sailor', soldiers: true, founded: 232 },
      { surname: 'Custodius', district: 'incarcer', home: 'incarcer_town', trade: 'Rehabilitation counselor', founded: 241 },
      { surname: 'Viator', district: 'solum', home: 'paludes', trade: 'Innkeeper on the road of trade', founded: 235 },
      { surname: 'Umbrius', district: 'malum_rec', home: 'forum_umbrae', trade: 'Blacksmith', founded: 240 },
      { surname: 'Carbonius', district: 'capital', home: 'capital_4', trade: 'Carbon plant engineer', founded: 244 },
    ],
    // second trades for people promoted to Dual Classman, and trades for those who leave the family trade
    trades: ['Teacher', 'Nurse', 'Builder', 'Translator (Latin, English and Russian)', 'Candle maker', 'Copper stamper at the treasury', 'Cook', 'Mechanic', 'Musician', 'Carpenter', 'Glassblower', 'Weaver', 'Surveyor', 'Medic', 'Scribe', 'Fisher', 'Farmer', 'Electrician', 'Boat builder', 'Baker', 'Mapmaker', 'Watchtower keeper'],
    male: ['Marcus', 'Lucius', 'Gaius', 'Titus', 'Felix', 'Anton', 'Ivan', 'Kenji', 'Emeka', 'Mateo', 'Rafael', 'Oskar', 'Dmitri', 'Tobias', 'Hugo', 'Arjun', 'Samir', 'Liam', 'Viktor', 'Kofi', 'Paulo', 'Cyrus', 'Elias', 'Jonah', 'Nikolai', 'Bruno', 'Aurel', 'Silas', 'Theo', 'Ravi'],
    female: ['Julia', 'Livia', 'Flavia', 'Cornelia', 'Aurelia', 'Marina', 'Petra', 'Silvia', 'Nadia', 'Yuki', 'Amara', 'Sofia', 'Ingrid', 'Mei', 'Zofia', 'Lucia', 'Elena', 'Priya', 'Anya', 'Chiara', 'Freya', 'Ada', 'Leila', 'Nina', 'Rosa', 'Tamsin', 'Valeria', 'Irina', 'Hana', 'Clara'],
    // surnames of people who marry into the families
    inLaws: ['Faber', 'Pastor', 'Fossor', 'Medicus', 'Lignarius', 'Rufus', 'Albinus', 'Varro', 'Corvinus', 'Severus', 'Marius', 'Calvus', 'Longinus', 'Crispus', 'Volkovius', 'Okaforius', 'Nakamurus', 'Lindqvistus', 'Petrovius', 'Moreaus', 'Castellanus', 'Brennanus', 'Mwangius', 'Haddadius', 'Kowalskius', 'Sokolovius', 'Tanakus', 'Ibarrus', 'Zhouius', 'Kaurius'],
  },

  // ------------------------------------------------------------------ THE FUTURE (Civitas simulation, after Year 312 AC)
  // Scripted events. `effects` change the simulation: war (start/end), blockade, copper (price change),
  // collapse (start/end), food (harvest change). Invented for the simulation, following oppressus.md:
  // after hundreds of years Oppressus goes to war, and eventually its economy collapses.
  future: [
    { ac: 316, kind: 'economy', title: 'A copper boom', text: 'Demand for copper soars around the flooded world, which is rebuilding its cities. Sovalus hires thousands of new miners.', effects: { copper: 0.35 } },
    { ac: 321, kind: 'economy', title: 'A bumper harvest', text: 'Planities has its best harvest in living memory. Some say Cura Aliud is stirring.', effects: { food: 0.15 } },
    { ac: 325, kind: 'politics', title: 'Warships off the coast', text: 'Ships of the Austral Compact, an alliance of southern nations that lost much of their coastline to the rising seas, begin testing the watchtower line.' },
    { ac: 327, kind: 'war', title: 'The Austral War begins', text: 'The Austral Compact demands a share of Oppressus\'s land and copper. Cilla declares war, and every 20- and 21-year-old is drafted.', effects: { war: 'start' } },
    { ac: 329, kind: 'war', title: 'The Corton Sea is blockaded', text: 'Enemy fleets close the Corton Sea. With the trade hub cut off, copper cannot leave and timber cannot arrive.', effects: { blockade: true } },
    { ac: 331, kind: 'war', title: 'The landing on the Nullus Sol coast', text: 'Enemy troops land on the flat, open shore of Nullus Sol, one of the country\'s weak points, and are driven back after a long battle.' },
    { ac: 334, kind: 'war', title: 'The Peace of Nova Cella', text: 'The war ends without a winner. The blockade is lifted, but Oppressus owes enormous war debts.', effects: { war: 'end', blockade: false } },
    { ac: 337, kind: 'economy', title: 'The Centum loses its value', text: 'To pay the war debts, the treasuries print more copper-stamped notes, and prices begin to climb.', effects: { copper: -0.15 } },
    { ac: 340, kind: 'economy', title: 'The copper price crashes', text: 'The rebuilt world no longer needs so much copper. The price falls by half, and mines in Sovalus begin to close.', effects: { copper: -0.5 } },
    { ac: 342, kind: 'economy', title: 'The Great Collapse', text: 'Banks close and debit cards stop working. Unemployment spreads, and thousands flee to Malum Rec, where no one asks questions.', effects: { collapse: 'start' } },
    { ac: 349, kind: 'economy', title: 'Bread lines in Nova Cella', text: 'Food from Planities can no longer be paid for. The treasuries hand out bread in the capital.', effects: { food: -0.2 } },
    { ac: 358, kind: 'economy', title: 'A slow recovery', text: 'Under a new generation of advisors, the carbon plants and fishing fleets slowly bring the economy back.', effects: { collapse: 'end', copper: 0.2 } },
  ],

  // ------------------------------------------------------------------ DISTRICTS
  // `id` must match the district names used by tools/build-terrain.js.
  districts: [
    {
      id: 'veskan_sea', name: 'Veskan Sea', color: '#4f86b5', label: [675, 1123], seat: 'vesca',
      kind: 'Naval district',
      location: 'The whole western side of the map: the long Antarctic Peninsula, the West Antarctic islands, the open water between them, and the mountain islands that run down to the south.',
      population: 2600000,
      ruler: { name: 'Tiberius Sokolov', title: 'District Ruler and Fleet Prefect', origin: 'Russian', invented: true },
      advisorPresent: true,
      summary: 'Mountainous islands where most of the navy trains.',
      description: 'Large mountainous islands. Most of the naval military is trained here, so hundreds of military camps are set up. Most normal people are not allowed to go here other than on tours. There is one town, however, on the other side of the large mountain island, on a little bit of flat land. Population is roughly 2,600,000.',
      facts: [
        'Hundreds of naval training camps',
        'Closed to ordinary citizens except on guided tours',
        'One civilian town, on a strip of flat land behind the great mountain island',
        'One of the two travelling Supreme Advisors is usually stationed here',
      ],
      geography: 'The Antarctic Peninsula, the West Antarctic archipelago, the Ross Sea and the southern Transantarctic Mountains.',
    },
    {
      id: 'cura_aliud', name: 'Cura Aliud', color: '#7a2e2e', label: [1071, 604],
      kind: 'Secluded sea',
      location: 'The enclosed bay in the upper middle of the map, together with the islands and coast to its west.',
      population: 0, populationNote: 'Abandoned',
      ruler: null, rulerNote: 'None. No one governs the dark sea.',
      summary: 'The "dark" sea. People who go there do not come back.',
      description: 'The "dark" sea. Stories are told of people coming here and never coming back. Trade never comes through this side, people don\'t venture to this side, and the whole place is treated as being as secluded as Mount Veston. Places along the coast are often abandoned. People tell stories of voices coming from the sea.',
      facts: [
        'No trade route passes through it',
        'Treated as being as secluded as Mount Veston',
        'Its coastal settlements are mostly abandoned',
      ],
      geography: 'A deep inland arm of the Weddell Sea, opened up when the ice sheet melted.',
    },
    {
      id: 'mount_veston', name: 'Mount Veston', color: '#c27c4e', label: [1451, 394], seat: 'cilla_cave',
      kind: 'Royal Zone',
      location: 'The band of high mountains across the top of the main landmass, from above Cura Aliud east to Sovalus.',
      royalZone: true,
      population: 5, populationNote: 'All lifelong guards',
      ruler: null, rulerNote: 'Ruled directly by Cilla, the Supreme Leader.',
      summary: 'The sacred mountain of Cilla\'s cave. Closed to everyone.',
      description: 'Nobody is permitted to go here. Cilla\'s cave is located here. It is guarded as the society\'s best-kept secret, as it is where Cilla inhabited the first emperor. The entire mountain is off limits to all. The population is about 5, and they are all lifelong guards.',
      facts: [
        'Site of Cilla\'s cave, where Cilla first entered a human vessel',
        'A Royal Zone: the entire mountain is off limits',
        'Guarded by five lifelong guards',
      ],
      geography: 'The mountains of Dronning Maud Land, the high northern rim of East Antarctica.',
    },
    {
      id: 'planities', name: 'Planities', color: '#9bb357', label: [1275, 535], seat: 'horrea',
      kind: 'Farming district',
      location: 'The lake-dotted plains in the north of the main landmass, between Cura Aliud and the Mount Veston range.',
      population: 4300000,
      ruler: { name: 'Flavia Haruna', title: 'District Ruler', origin: 'Japanese', invented: true },
      summary: 'Strangely fertile flatlands that grow almost all of the food.',
      description: 'The flatlands and the farming area. Almost all of the agricultural resources are farmed here. The land here is strangely fertile, and nobody knows why; some say it has something to do with Cura Aliud. Population: 4.3 million.',
      facts: [
        'Produces almost all of Oppressus\'s food',
        'Its soil is unexplainably fertile for such a cold land',
        'Sells food to the mining city of Sovalus',
      ],
      geography: 'Lowland plains between the Dronning Maud Land mountains and the Weddell Sea.',
    },
    {
      id: 'apricus', name: 'Apricus', color: '#3f8a5a', label: [1072, 785], seat: 'silvanum',
      kind: 'Forest district',
      location: 'The peninsula that curls along the southern shore of Cura Aliud.',
      population: 2000000,
      ruler: { name: 'Silvanus Adeyemi', title: 'District Ruler', origin: 'Yoruba', invented: true },
      summary: 'A sunlit, protected forest: the only forest in Oppressus.',
      description: 'Called Apricus because of the large amount of sunlight. It is also a giant forest. People are not allowed to harm the wildlife here, so the forest kept growing. There are still many, many towns and houses; they are just built around the vast forest. Population: 2 million.',
      facts: [
        'The only forest in Oppressus',
        'Protected by the law against attacking wildlife, so its timber cannot be cut',
        'Because the forest is protected, Oppressus must import most of its wood',
      ],
      geography: 'A peninsula on the southern shore of Cura Aliud.',
    },
    {
      id: 'capital', name: 'Capital', color: '#d9b779', label: [1335, 770], seat: 'nova_cella',
      kind: 'Capital district',
      location: 'The middle of the main landmass, between Apricus, Planities and Mount Solum. Its northwest edge touches Cura Aliud.',
      population: 14000000,
      ruler: { name: 'Cassius Orlovius', title: 'District Ruler', origin: 'Russian', invented: true },
      summary: 'Nova Cella: a 14-million-person city of merchants, advisors and the emperor.',
      description: 'The capital is a bustling city with roughly 14 million people; almost all the merchants live here. The emperor has a house here, and 6 of the 8 advisors are always here; the other two are usually split between the Veskan Sea and Incarcer. Almost the entire place looks like a mix of New York and Beijing, with tons of people everywhere, streets, and tons of money being made. The only non-bustling part of the city is the coast of Cura Aliud; that place is kind of a ghost town, with broken-down houses, fallen skyscrapers, and nobody in sight.',
      facts: [
        'Home of the Supreme Leader (the emperor) and 6 of the 8 Supreme Advisors',
        'Almost all merchants live here',
        'Looks like a mix of New York and Beijing',
        'Its Cura Aliud shoreline is an abandoned ghost town',
      ],
      geography: 'The low ground near the South Pole itself, between the Weddell Sea and the Gamburtsev Mountains.',
    },
    {
      id: 'malum_rec', name: 'Malum Rec', color: '#6b5580', label: [1603, 611], seat: 'forum_umbrae',
      kind: 'Lawless district',
      location: 'A narrow valley between the Veston mountains and Mount Solum, linking Sovalus to the capital.',
      population: 3500000, populationNote: 'Unknown; estimated at 2 to 5 million',
      ruler: { name: 'Decimus Kray', title: 'District Ruler (in name only)', origin: 'English', invented: true },
      rulerNote: 'The government stays out of Malum Rec for fear of a revolt.',
      summary: 'A dark valley of hidden trades, fugitives and refuge.',
      description: 'The darkest area. Trapped between two mountains, the sun only shines here for part of the day. A massive underground weapons trade, and anything that people don\'t want others knowing about, happens here. The population is unknown but estimated at between 2 and 5 million. People on the run stay here, people in trouble stay here, people who need protection stay here, and the government doesn\'t stick its nose in here for fear of a revolt. Traders often pass through here between the mining city and the capital.',
      facts: [
        'Sunlight reaches the valley floor for only part of the day',
        'Center of an underground weapons trade',
        'A refuge for people on the run or in need of protection',
        'On the trade route between Sovalus and the Capital',
      ],
      geography: 'A deep valley between the Dronning Maud Land mountains and the Gamburtsev range.',
    },
    {
      id: 'sovalus', name: 'Sovalus', color: '#b85c7a', label: [1772, 425], seat: 'sovalus_city',
      kind: 'Mining district',
      location: 'The northeast corner of the main landmass.',
      population: 1440000,
      ruler: { name: 'Bogdan Ferrarius', title: 'District Ruler', origin: 'Polish', invented: true },
      summary: 'The mining city: copper, gold, silver and many other metals.',
      description: 'The mining city. This entire city runs on mining. The merchants buy from them and sell them food from the capital and Planities, forming a trade route. They have a population of around 1,440,000.',
      facts: [
        'Copper is the main export of all of Oppressus',
        'Also mines gold, silver, iron, platinum-group metals, chromium, nickel, cobalt, lead, zinc and coal',
        'Buys its food from the Capital and Planities',
      ],
      metals: ['Copper', 'Gold', 'Silver', 'Iron', 'Platinum-group metals', 'Chromium', 'Nickel', 'Cobalt', 'Lead', 'Zinc', 'Coal'],
      geography: 'The Enderby Land and Prince Charles Mountains region, where real iron-ore deposits are known.',
    },
    {
      id: 'solum', name: 'Solum', color: '#a9b9cc', label: [1505, 975], seat: 'paludes',
      kind: 'Mountain and trade-road district',
      location: 'The large central region: the lone Mount Solum, the wetlands and lakes south of it, and the lowlands to its east.',
      population: 50030, populationNote: '30 on the mountain, about 50,000 in the wetlands',
      ruler: { name: 'Petra Castellanos', title: 'District Ruler', origin: 'Spanish', invented: true },
      summary: 'Mount Solum, the loneliest mountain, and the road of trade.',
      description: 'Also known as Mount Solum, it is the loneliest mountain, with a population of 30 on the entire mountain, mostly in one small town around the base. There is a wetlands area with roughly 50,000 people near the base, leading into the capital. The road of trade is also here, so imports and exports from the Corton Sea pass through here into the capital. The towns are spread out along this road.',
      facts: [
        'Mount Solum, "the loneliest mountain"',
        'Only 30 people live on the mountain itself',
        'About 50,000 people live in the wetlands that lead into the capital',
        'The road of trade runs from the Corton Sea, through Solum, to the Capital',
      ],
      geography: 'The Gamburtsev Mountains, a lone mountain range in the middle of East Antarctica, once buried under 3 km of ice.',
    },
    {
      id: 'incarcer', name: 'Incarcer', color: '#6b6b70', label: [1760, 880], seat: 'incarcer_town',
      kind: 'Prison district',
      location: 'An oval of inland plains east of Mount Solum.',
      population: 15000,
      ruler: { name: 'Justina Lindqvist', title: 'District Ruler and Chief Warden', origin: 'Swedish', invented: true },
      advisorPresent: true,
      summary: 'A rehabilitation prison-town, and the white-room prison Incarculuss.',
      description: 'The land of prison, in the same style as Swedish prisons, just on a larger scale: many small, spread-out homes. Essentially a town of rehabilitating prisoners. One large prison, called Incarculuss, is built close to the edge of Nullus Sol. It is used as a torture prison, where people are put under white room torture for only the most heinous acts, as a replacement for the death penalty. Population: 15,000.',
      facts: [
        'Rehabilitation-based, like Sweden\'s prison system',
        'Prisoners live in many small, spread-out homes',
        'Incarculuss, near the Nullus Sol border, holds the white-room prisoners',
        'One of the two travelling Supreme Advisors is usually stationed here',
      ],
      geography: 'Inland plains of Princess Elizabeth Land.',
    },
    {
      id: 'nullus_sol', name: 'Nullus Sol', color: '#b08a3e', label: [2002, 1042], seat: 'campus_olei',
      kind: 'Wasteland',
      location: 'The far eastern coast, east and south of Incarcer.',
      population: 300,
      ruler: { name: 'Varro Okafor', title: 'District Ruler', origin: 'Igbo', invented: true },
      summary: 'A hot, humid, abandoned oil field where outlaws hide.',
      description: 'An ancient field where oil used to be mined. It is hot and humid, and usually nobody goes here. The population is around 300, all insane, evil people who needed to hide from horrid punishment.',
      facts: [
        'One of the old foreign oil fields, shut down long ago',
        'Strangely hot and humid for Antarctica',
        'About 300 fugitives hide here',
        'The sea off its coast is unsafe',
      ],
      geography: 'The coast of Queen Mary Land and Wilhelm II Land.',
    },
    {
      id: 'corton_sea', name: 'Corton Sea', color: '#3aa6a0', label: [1755, 1423], seat: 'portus_corton',
      kind: 'Port district',
      location: 'The island-filled bay in the southeast, below Solum and Nullus Sol.',
      population: 360000,
      ruler: { name: 'Marina Delacroix', title: 'District Ruler', origin: 'French', invented: true },
      summary: 'Fishing villages and the trade hub for all imports and exports.',
      description: 'A semi-popular inhabited area. The water near the Nullus Sol coast is unsafe to be in, but the land on the other side is full of life and prosperity. There is a nice community here, like a humble fishing village. Population is about 360,000. The trade hub is also here, so all imports and exports come through here.',
      facts: [
        'All imports and exports pass through its trade hub',
        'A friendly community of fishing villages',
        'The water near the Nullus Sol coast is unsafe',
      ],
      geography: 'The Wilkes Subglacial Basin, which became an island-filled sea once the ice melted.',
    },
  ],

  // ------------------------------------------------------------------ PLACES
  // Named places from districts.md plus the economic sites from oppressus.md.
  // type: capital | city | town | quarter | palace | sacred | prison | rehab | military | mine | port | timber |
  //       treasury | carbon | market | ruin | oilfield | farm | forest | wetland | fishing | camp | summit | danger
  // tier: 1 = always shown, 2 = shown when zoomed in a little, 3 = shown when zoomed in close
  // population: people living there. A district's population = all of its places + all of its towns (below).
  places: [
    { id: 'nova_cella', name: 'Nova Cella', type: 'capital', district: 'capital', pos: [1300, 846], tier: 1, invented: true,
      population: 5200000,
      description: 'The capital city: a bustling city that looks like a mix of New York and Beijing, where almost all the merchants live. This is the city center; with its surrounding quarters the whole city holds about 14 million people.' },
    { id: 'domus_cillae', name: 'Domus Cillae', type: 'palace', district: 'capital', pos: [1330, 874], tier: 3, invented: true, royalZone: true,
      description: 'The house of the emperor, the Supreme Leader in whom Cilla lives. Six of the eight Supreme Advisors are always here.' },
    { id: 'aerarium_magnum', name: 'Aerarium Magnum', type: 'treasury', district: 'capital', pos: [1284, 822], tier: 3, invented: true,
      description: 'The great treasury of Oppressus. It prints the copper-stamped notes, receives the 1% of all wealth given to Cilla, and exchanges U.S. dollars and Russian rubles.' },
    { id: 'officina_cellae', name: 'Officina Carbonis', type: 'carbon', district: 'capital', pos: [1262, 905], tier: 3, invented: true,
      description: 'A carbon plant that pulls CO2 out of the air and recycles it into carbon products and synthetic fuel, the oil traded inside Oppressus.' },
    { id: 'litus_desertum', name: 'Litus Desertum', type: 'ruin', district: 'capital', pos: [1237, 748], tier: 2, invented: true,
      population: 0,
      description: 'The Cura Aliud coast of the capital: a ghost town of broken-down houses and fallen skyscrapers, with nobody in sight.' },
    { id: 'cilla_cave', name: 'Cilla\'s Cave', type: 'sacred', district: 'mount_veston', pos: [1400, 384], tier: 1, royalZone: true,
      population: 5,
      description: 'The cave where a man claimed that the god Cilla had entered his body. Oppressus was founded here. It is the society\'s best-kept secret, and only its five lifelong guards may approach.' },
    { id: 'horrea', name: 'Horrea', type: 'farm', district: 'planities', pos: [1240, 560], tier: 2, invented: true,
      population: 620000,
      description: 'The great granaries of Planities, at the heart of the farmland that feeds Oppressus.' },
    { id: 'silvanum', name: 'Silvanum', type: 'forest', district: 'apricus', pos: [1048, 770], tier: 2, invented: true,
      population: 310000,
      description: 'The largest of the towns built around the forest of Apricus.' },
    { id: 'forum_umbrae', name: 'Forum Umbrae', type: 'market', district: 'malum_rec', pos: [1560, 650], tier: 2, invented: true,
      population: 720000, estimated: true,
      description: 'The "market of shadows": the underground weapons trade of Malum Rec, on the traders\' road between Sovalus and the Capital.' },
    { id: 'sovalus_city', name: 'Sovalus City', type: 'city', district: 'sovalus', pos: [1770, 498], tier: 1,
      population: 880000,
      description: 'The mining city. The whole city runs on mining copper, gold, silver and other metals. Merchants buy its metals and sell it food from the Capital and Planities.' },
    { id: 'aerarium_sovalus', name: 'Aerarium Sovalus', type: 'treasury', district: 'sovalus', pos: [1790, 515], tier: 3, invented: true,
      description: 'The treasury of the mining city, where miners are paid and metals are bought for export.' },
    { id: 'mount_solum', name: 'Mount Solum', type: 'summit', district: 'solum', pos: [1489, 889], tier: 1,
      description: 'The loneliest mountain. Only 30 people live on the entire mountain.' },
    { id: 'radix', name: 'Radix', type: 'town', district: 'solum', pos: [1465, 1060], tier: 3, invented: true,
      population: 24,
      description: 'The one small town at the base of Mount Solum, home to most of the mountain\'s 30 residents.' },
    { id: 'paludes', name: 'Paludes Solum', type: 'wetland', district: 'solum', pos: [1340, 1070], tier: 2, invented: true,
      population: 18000,
      description: 'The biggest settlement of the Solum wetlands. About 50,000 people live in the wetlands and the towns along the road of trade leading into the capital.' },
    { id: 'incarcer_town', name: 'Incarcer', type: 'rehab', district: 'incarcer', pos: [1735, 960], tier: 2,
      population: 9400,
      description: 'A town of rehabilitating prisoners, living in many small, spread-out homes in the style of Swedish prisons.' },
    { id: 'incarculuss', name: 'Incarculuss', type: 'prison', district: 'incarcer', pos: [1846, 981], tier: 1,
      population: 260,
      description: 'The white-room torture prison, built close to the edge of Nullus Sol, for only the most heinous crimes. It replaces the death penalty.' },
    { id: 'campus_olei', name: 'Campus Olei', type: 'oilfield', district: 'nullus_sol', pos: [1975, 1095], tier: 2, invented: true,
      population: 140,
      description: 'The ancient oil field of Nullus Sol, abandoned since the oil rigs were taken down. Hot and humid; the largest hideout of the district\'s 300 fugitives.' },
    { id: 'portus_corton', name: 'Portus Corton', type: 'port', district: 'corton_sea', pos: [1660, 1470], tier: 1, invented: true,
      population: 152000,
      description: 'The trade hub: every import and export of Oppressus passes through this port.' },
    { id: 'aerarium_corton', name: 'Aerarium Corton', type: 'treasury', district: 'corton_sea', pos: [1676, 1484], tier: 3, invented: true,
      description: 'The port treasury, where foreign traders exchange U.S. dollars and Russian rubles for Oppressan notes.' },
    { id: 'navale_lignarium', name: 'Navale Lignarium', type: 'timber', district: 'corton_sea', pos: [1681, 1540], tier: 3, invented: true,
      description: 'The timber wharf. Oppressus has to buy most of its wood, and nearly all of it arrives here.' },
    { id: 'officina_corton', name: 'Officina Maris', type: 'carbon', district: 'corton_sea', pos: [1604, 1382], tier: 3, invented: true,
      description: 'A carbon plant on the Corton Sea that recycles CO2 into carbon products and synthetic fuel.' },
    { id: 'piscatoria', name: 'Piscatoria', type: 'fishing', district: 'corton_sea', pos: [1760, 1565], tier: 3, invented: true,
      population: 21000,
      description: 'A humble fishing village, typical of the friendly communities of the Corton Sea.' },
    { id: 'aquae_malae', name: 'Aquae Malae', type: 'danger', district: 'corton_sea', pos: [1975, 1330], tier: 3, invented: true,
      description: 'The unsafe water near the Nullus Sol coast. Nobody swims or fishes here.' },
    { id: 'vesca', name: 'Vesca', type: 'town', district: 'veskan_sea', pos: [889, 1072], tier: 2, invented: true,
      population: 380000,
      description: 'The one civilian town of the Veskan Sea, on a little bit of flat land on the far side of the great mountain island. One of the two travelling Supreme Advisors usually stays here.' },
    { id: 'castra_1', name: 'Castra Navalia', type: 'military', district: 'veskan_sea', pos: [1120, 1080], tier: 2, invented: true, royalZone: true,
      population: 410000,
      description: 'The largest of the hundreds of naval training camps on the Veskan islands.' },
    { id: 'castra_2', name: 'Castra Borealis', type: 'military', district: 'veskan_sea', pos: [690, 1300], tier: 3, invented: true, royalZone: true,
      population: 190000,
      description: 'A naval training camp on the great western island.' },
    { id: 'castra_3', name: 'Castra Peninsulae', type: 'military', district: 'veskan_sea', pos: [420, 590], tier: 3, invented: true, royalZone: true,
      population: 120000,
      description: 'A naval training camp on the old Antarctic Peninsula.' },
  ],

  // Smaller towns in every district, generated by tools/generate-towns.js (names invented).
  // Their populations, together with the places above, add up to each district's population.
  // <towns:generated>
  towns: [
    { id: 'capital_1', name: 'Forum Mercatorum', type: 'quarter', district: 'capital', pos: [1273, 868], population: 2932000 },
    { id: 'capital_2', name: 'Turres Aureae', type: 'quarter', district: 'capital', pos: [1318, 817], population: 1381000 },
    { id: 'capital_3', name: 'Nova Volga', type: 'quarter', district: 'capital', pos: [1255, 841], population: 1236000 },
    { id: 'capital_4', name: 'Brooklyna', type: 'quarter', district: 'capital', pos: [1300, 892], population: 901000 },
    { id: 'capital_5', name: 'Xinhua Vicus', type: 'quarter', district: 'capital', pos: [1252, 811], population: 571000 },
    { id: 'capital_6', name: 'Collis Advocatorum', type: 'quarter', district: 'capital', pos: [1351, 814], population: 607000 },
    { id: 'capital_7', name: 'Porta Corton', type: 'quarter', district: 'capital', pos: [1300, 790], population: 611000 },
    { id: 'capital_8', name: 'Vicus Candelarum', type: 'quarter', district: 'capital', pos: [1243, 874], population: 561000 },
    { id: 'planities_1', name: 'Messis', type: 'farm', district: 'planities', pos: [1222, 412], population: 832000 },
    { id: 'planities_2', name: 'Ager Aureus', type: 'farm', district: 'planities', pos: [1285, 586], population: 570000 },
    { id: 'planities_3', name: 'Fertilia', type: 'farm', district: 'planities', pos: [1252, 508], population: 459000 },
    { id: 'planities_4', name: 'Novoselye', type: 'farm', district: 'planities', pos: [1279, 511], population: 433000 },
    { id: 'planities_5', name: 'Seges', type: 'farm', district: 'planities', pos: [1180, 556], population: 296000 },
    { id: 'planities_6', name: 'Granum', type: 'farm', district: 'planities', pos: [1279, 535], population: 267000 },
    { id: 'planities_7', name: 'Kornveld', type: 'farm', district: 'planities', pos: [1315, 589], population: 227000 },
    { id: 'planities_8', name: 'Pratum Magnum', type: 'farm', district: 'planities', pos: [1270, 613], population: 239000 },
    { id: 'planities_9', name: 'Hordeum', type: 'farm', district: 'planities', pos: [1237, 532], population: 175000 },
    { id: 'planities_10', name: 'Arvum', type: 'farm', district: 'planities', pos: [1294, 607], population: 182000 },
    { id: 'apricus_1', name: 'Lux Silvae', type: 'forest', district: 'apricus', pos: [1156, 856], population: 499400 },
    { id: 'apricus_2', name: 'Quercetum', type: 'forest', district: 'apricus', pos: [1183, 841], population: 335000 },
    { id: 'apricus_3', name: 'Sunhaven', type: 'forest', district: 'apricus', pos: [1138, 814], population: 243100 },
    { id: 'apricus_4', name: 'Bosque Claro', type: 'forest', district: 'apricus', pos: [988, 763], population: 156800 },
    { id: 'apricus_5', name: 'Nemus', type: 'forest', district: 'apricus', pos: [1084, 775], population: 167900 },
    { id: 'apricus_6', name: 'Morigaoka', type: 'forest', district: 'apricus', pos: [943, 757], population: 145400 },
    { id: 'apricus_7', name: 'Ramus', type: 'forest', district: 'apricus', pos: [1126, 805], population: 142400 },
    { id: 'malum_rec_1', name: 'Crepusculum', type: 'town', district: 'malum_rec', pos: [1504, 703], population: 1072000 },
    { id: 'malum_rec_2', name: 'Latebra', type: 'town', district: 'malum_rec', pos: [1480, 763], population: 441000 },
    { id: 'malum_rec_3', name: 'Sumrak', type: 'town', district: 'malum_rec', pos: [1486, 712], population: 416000 },
    { id: 'malum_rec_4', name: 'Refugium', type: 'town', district: 'malum_rec', pos: [1489, 724], population: 371000 },
    { id: 'malum_rec_5', name: 'Nox Media', type: 'town', district: 'malum_rec', pos: [1558, 682], population: 221000 },
    { id: 'malum_rec_6', name: 'Fossa', type: 'town', district: 'malum_rec', pos: [1507, 751], population: 259000 },
    { id: 'sovalus_1', name: 'Cuprum', type: 'mine', district: 'sovalus', pos: [1672, 421], population: 178200, produces: ['Copper'] },
    { id: 'sovalus_2', name: 'Aurifodina', type: 'mine', district: 'sovalus', pos: [1852, 484], population: 117800, produces: ['Gold','Silver'] },
    { id: 'sovalus_3', name: 'Argentaria', type: 'mine', district: 'sovalus', pos: [1837, 562], population: 61200, produces: ['Silver','Lead','Zinc'] },
    { id: 'sovalus_4', name: 'Ferraria', type: 'mine', district: 'sovalus', pos: [1810, 583], population: 51600, produces: ['Iron','Chromium'] },
    { id: 'sovalus_5', name: 'Nikelgrad', type: 'mine', district: 'sovalus', pos: [1858, 646], population: 58300, produces: ['Nickel','Cobalt'] },
    { id: 'sovalus_6', name: 'Kupferberg', type: 'mine', district: 'sovalus', pos: [1723, 436], population: 48800, produces: ['Copper','Platinum-group metals'] },
    { id: 'sovalus_7', name: 'Plumbum', type: 'mine', district: 'sovalus', pos: [1906, 604], population: 44100, produces: ['Lead','Zinc','Coal'] },
    { id: 'solum_1', name: 'Mansio Prima', type: 'town', district: 'solum', pos: [1414, 1111], population: 13770 },
    { id: 'solum_2', name: 'Pons Paludis', type: 'town', district: 'solum', pos: [1462, 1153], population: 5040 },
    { id: 'solum_3', name: 'Taberna', type: 'town', district: 'solum', pos: [1432, 1126], population: 4720 },
    { id: 'solum_4', name: 'Vadum', type: 'town', district: 'solum', pos: [1474, 1165], population: 4600 },
    { id: 'solum_5', name: 'Mansio Secunda', type: 'town', district: 'solum', pos: [1336, 1057], population: 3870 },
    { id: 'corton_sea_1', name: 'Rybachy', type: 'fishing', district: 'corton_sea', pos: [1804, 1285], population: 65240 },
    { id: 'corton_sea_2', name: 'Retia', type: 'fishing', district: 'corton_sea', pos: [1741, 1693], population: 28120 },
    { id: 'corton_sea_3', name: 'Fiskevik', type: 'fishing', district: 'corton_sea', pos: [1684, 1651], population: 18760 },
    { id: 'corton_sea_4', name: 'Ostrea', type: 'fishing', district: 'corton_sea', pos: [1723, 1438], population: 20130 },
    { id: 'corton_sea_5', name: 'Concha', type: 'fishing', district: 'corton_sea', pos: [1786, 1159], population: 19490 },
    { id: 'corton_sea_6', name: 'Sal', type: 'fishing', district: 'corton_sea', pos: [1816, 1504], population: 11210 },
    { id: 'corton_sea_7', name: 'Halcyon', type: 'fishing', district: 'corton_sea', pos: [1594, 1462], population: 10590 },
    { id: 'corton_sea_8', name: 'Port Kelp', type: 'fishing', district: 'corton_sea', pos: [1555, 1300], population: 13460 },
    { id: 'veskan_sea_1', name: 'Navale Magnum', type: 'military', district: 'veskan_sea', pos: [463, 823], population: 429000, royalZone: true },
    { id: 'veskan_sea_2', name: 'Castra Glacialis', type: 'military', district: 'veskan_sea', pos: [481, 1042], population: 233900, royalZone: true },
    { id: 'veskan_sea_3', name: 'Castra Petrova', type: 'military', district: 'veskan_sea', pos: [1306, 1534], population: 179000, royalZone: true },
    { id: 'veskan_sea_4', name: 'Fort Erebus', type: 'military', district: 'veskan_sea', pos: [568, 871], population: 139400, royalZone: true },
    { id: 'veskan_sea_5', name: 'Castra Ventosa', type: 'military', district: 'veskan_sea', pos: [523, 796], population: 122900, royalZone: true },
    { id: 'veskan_sea_6', name: 'Castra Insularum', type: 'military', district: 'veskan_sea', pos: [838, 1087], population: 93600, royalZone: true },
    { id: 'veskan_sea_7', name: 'Castra Tridentis', type: 'military', district: 'veskan_sea', pos: [772, 1369], population: 71600, royalZone: true },
    { id: 'veskan_sea_8', name: 'Castra Amundseni', type: 'military', district: 'veskan_sea', pos: [1030, 901], population: 91700, royalZone: true },
    { id: 'veskan_sea_9', name: 'Castra Byrdi', type: 'military', district: 'veskan_sea', pos: [1288, 1408], population: 61700, royalZone: true },
    { id: 'veskan_sea_10', name: 'Castra Ellsworth', type: 'military', district: 'veskan_sea', pos: [421, 646], population: 77200, royalZone: true },
    { id: 'incarcer_1', name: 'Nova Spes', type: 'rehab', district: 'incarcer', pos: [1834, 886], population: 2060 },
    { id: 'incarcer_2', name: 'Secunda Vita', type: 'rehab', district: 'incarcer', pos: [1732, 1009], population: 1340 },
    { id: 'incarcer_3', name: 'Lindhem', type: 'rehab', district: 'incarcer', pos: [1774, 925], population: 1190 },
    { id: 'incarcer_4', name: 'Hortus', type: 'rehab', district: 'incarcer', pos: [1831, 925], population: 750 },
    { id: 'nullus_sol_1', name: 'Fumaria', type: 'camp', district: 'nullus_sol', pos: [1954, 994], population: 82 },
    { id: 'nullus_sol_2', name: 'Sudor', type: 'camp', district: 'nullus_sol', pos: [1945, 1015], population: 39 },
    { id: 'nullus_sol_3', name: 'Latebrae', type: 'camp', district: 'nullus_sol', pos: [1903, 1018], population: 39 },
    { id: 'cura_aliud_1', name: 'Silentium', type: 'ruin', district: 'cura_aliud', pos: [1210, 616], population: 0, abandoned: true },
    { id: 'cura_aliud_2', name: 'Ultimus Portus', type: 'ruin', district: 'cura_aliud', pos: [910, 553], population: 0, abandoned: true },
    { id: 'cura_aliud_3', name: 'Vacua', type: 'ruin', district: 'cura_aliud', pos: [997, 634], population: 0, abandoned: true },
    { id: 'cura_aliud_4', name: 'Echo', type: 'ruin', district: 'cura_aliud', pos: [1000, 583], population: 0, abandoned: true },
    { id: 'solum_hamlet', name: 'Specula', type: 'town', district: 'solum', pos: [1495, 856], population: 6 },
  ],
  // </towns:generated>

  // Trade routes for the Civitas economy overlay. Each path is a list of place ids or [x, y] points;
  // 'road' follows the road of trade from the Corton Sea to the capital, 'road-back' the other way.
  // `volume` says what makes the flow thicker or thinner in the simulation.
  trade: [
    { id: 'copper', name: 'Copper exports', color: '#e07b39', volume: 'copper', offset: 0,
      note: 'Copper, the main export, travels from the mines of Sovalus through Malum Rec to the capital, then down the road of trade to Portus Corton and out to the world.',
      paths: [['sovalus_city', 'forum_umbrae', 'nova_cella', 'road-back', [2090, 1770]]] },
    { id: 'minerals', name: 'Gold, silver and other metals', color: '#c7c9cf', volume: 'minerals', offset: 7,
      note: 'Gold, silver, iron, nickel and the other metals of Sovalus are sold to the merchants of the capital and kept in its treasury.',
      paths: [['sovalus_1', 'sovalus_city', 'forum_umbrae', 'aerarium_magnum']] },
    { id: 'food', name: 'Food', color: '#9cc95a', volume: 'food', offset: -7,
      note: 'Planities grows almost all of the food. It feeds the capital, and merchants carry it to the miners of Sovalus.',
      paths: [['horrea', 'nova_cella'], ['planities_2', 'forum_umbrae', 'sovalus_city']] },
    { id: 'fuel', name: 'Synthetic oil (from the carbon plants)', color: '#5aa0d6', volume: 'fuel', offset: 0,
      note: 'The carbon plants turn recycled CO2 into fuel. This is the oil traded inside Oppressus, to the farms, the navy and the port.',
      paths: [['officina_cellae', 'nova_cella'], ['officina_cellae', 'horrea'], ['officina_cellae', 'paludes', 'castra_1'], ['officina_corton', 'portus_corton']] },
    { id: 'timber', name: 'Timber imports', color: '#b98a52', volume: 'timber', offset: -7,
      note: 'With its only forest protected, Oppressus must buy most of its wood. Timber ships unload at the Navale Lignarium, and the wood travels up the road of trade.',
      paths: [[[2110, 1830], 'navale_lignarium', 'road']] },
  ],

  // The road of trade: Corton Sea -> Solum -> Capital (a list of points)
  tradeRoad: [[1660, 1470], [1600, 1360], [1540, 1240], [1460, 1150], [1400, 1100], [1340, 1070], [1310, 960], [1300, 846]],

  // ------------------------------------------------------------------ HISTORY (Historia view)
  // Years are CE. Year 1 Anno Cillae (AC) = 2207 CE. The melt is sped up to fit a human story;
  // the captions say so. Years marked "invented" in comments were made up for the simulation.
  history: {
    startYear: 2026,
    endYear: 2518, // = Year 312 AC, the simulation's present (must match meta.presentYearAC)

    // The seven stops on the timeline. `year` is where the slider stops for that chapter.
    chapters: [
      {
        id: 'ice', year: 2026, title: 'The Frozen Continent', range: 'Present day',
        caption: 'Today Antarctica is buried under an ice sheet up to 4.8 km thick, holding about 70% of the fresh water on Earth. The ice is so heavy that it has pressed the rock beneath it hundreds of meters down into the Earth, and much of West Antarctica\'s bedrock lies far below sea level. Scientists from many nations live at research stations, and the Antarctic Treaty protects the continent from mining.',
        note: 'If all of Antarctica\'s ice melted, global sea level would rise by about 58 meters.',
      },
      {
        id: 'oil', year: 2060, title: 'The Oil Rush', range: '2048 – 2173 CE',
        caption: 'In 2048 the Antarctic Treaty\'s ban on mining could be reviewed for the first time. The United States, China and Russia all made strong attempts to mine oil in Antarctica, building rigs on the Ross Sea, in Prydz Bay and along the coast of Queen Mary Land. Burning this oil released more carbon dioxide into the air, which made global warming worse and sped up the melting of the ice.',
        note: 'The 1991 Madrid Protocol bans mining in Antarctica. 2048 is the first year a review of that ban can be requested.',
      },
      {
        id: 'melt', year: 2100, title: 'The Great Melt', range: '2065 – 2230 CE',
        caption: 'As the planet warmed, the floating ice shelves around the coast broke apart first. Without them holding it back, the land ice slid faster into the sea. Over about a century and a half the ice sheet shrank toward the interior, and the meltwater raised sea levels around the world, flooding coastlines on every continent.',
        note: 'In this simulation the melt is sped up to fit a human story. In reality, melting the whole ice sheet would take thousands of years.',
      },
      {
        id: 'rebound', year: 2135, title: 'The Land Rises', range: '2080 – 2460 CE',
        caption: 'With the weight of the ice removed, the Earth\'s crust slowly floated back up, like a boat rising when its cargo is unloaded. This is called isostatic rebound. Land that had been pressed below the sea climbed back out of the water, raising new plains and joining islands together. The rebound was greatest where the ice had been thickest, and it continued for centuries after the ice was gone.',
        note: 'This is already happening: parts of West Antarctica are rising by several centimeters per year as ice is lost.',
      },
      {
        id: 'facility', year: 2170, title: 'The Facility', range: '2170 CE',
        caption: 'A group of researchers built a giant research facility on the shore of a newly opened sea, in an attempt to find a way to stop the damage. They took down the foreign oil fields, and the rigs were left to rust. The facility became a gathering place for scientists, workers and people who had lost their homes to the rising seas.',
        note: 'Some Oppressans say the fallen towers of Litus Desertum, a short way along the Cura Aliud coast, were once part of the facility.',
      },
      {
        id: 'cilla', year: 2207, title: 'The Coming of Cilla', range: 'Year 1 AC (2207 CE)',
        caption: 'A man claimed to have found a cave high on Mount Veston, and that inside it the god Cilla had entered his body. He convinced a great many people that Cilla had come to rule the land through him. United by this belief, his followers founded Oppressus, a theocracy ruled by Cilla\'s chosen vessel. The day Cilla entered the first vessel is celebrated every year as Dies Creationis, the Day of Creation, and it begins the Oppressan calendar: Year 1 Anno Cillae.',
        note: 'Cilla comes from cella, the Latin word for "cell," because Oppressans believe everything comes from cells.',
      },
      {
        id: 'expansion', year: 2518, title: 'Expansion', range: 'Year 1 – 312 AC',
        caption: 'Over the next three centuries, settlers spread across the risen land. Farms filled the strangely fertile plains of Planities, miners opened the city of Sovalus, and the port on the Corton Sea became the gateway for all trade. Each new district was given a District Ruler who answers to Cilla. By Year 312 AC, Oppressus is home to about 28 million people in twelve districts.',
        note: 'Copper is Oppressus\'s main export, and most wood has to be imported, because the only forest, in Apricus, is protected.',
      },
    ],

    // Year each district was founded, in Anno Cillae (invented for the simulation).
    districtFounded: {
      mount_veston: 1, capital: 4, planities: 18, solum: 31, corton_sea: 44, sovalus: 62,
      apricus: 79, veskan_sea: 97, incarcer: 126, malum_rec: 158, nullus_sol: 183, cura_aliud: 205,
    },

    // Smaller events shown as ticks on the timeline. kind: world | oppressus | science
    events: [
      { year: 2026, kind: 'science', title: 'The ice at its fullest', text: 'Antarctica\'s ice sheet holds enough water to raise global sea level by about 58 meters.' },
      { year: 2048, kind: 'world', title: 'The mining ban comes up for review', text: 'The Antarctic Treaty\'s ban on mining can be reviewed for the first time.' },
      { year: 2052, kind: 'world', title: 'The first oil rigs', text: 'The United States, China and Russia begin drilling for oil in Antarctica.' },
      { year: 2071, kind: 'science', title: 'The ice shelves collapse', text: 'The floating ice shelves around the coast break apart, and the land ice begins to slide faster into the sea.' },
      { year: 2170, kind: 'world', title: 'The facility is built', text: 'Researchers build a giant facility on the Cura Aliud shore to try to stop the damage.' },
      { year: 2173, kind: 'world', title: 'The oil fields are taken down', text: 'The researchers take down the foreign oil fields. The rigs are left to rust; the field in Queen Mary Land will one day be called Nullus Sol.' },
      { year: 2207, kind: 'oppressus', title: 'Dies Creationis', text: 'Cilla enters the first vessel in a cave on Mount Veston. Oppressus is founded: Year 1 AC.' },
      { year: 2230, kind: 'science', title: 'The last of the ice', text: 'The last remnant of the ice sheet melts away in the interior. Sea level has risen by about 58 meters.' },
      { year: 2210, kind: 'oppressus', title: 'Nova Cella is founded', text: 'The capital, Nova Cella, is built near the old research facility. (Year 4 AC)' },
      { year: 2268, kind: 'oppressus', title: 'Sovalus opens its mines', text: 'Miners open the city of Sovalus. Copper soon becomes Oppressus\'s main export. (Year 62 AC)' },
      { year: 2285, kind: 'oppressus', title: 'The forest of Apricus is protected', text: 'Harming wildlife is outlawed, and the forest of Apricus begins to grow without limit. (Year 79 AC)' },
      { year: 2332, kind: 'oppressus', title: 'Incarcer is founded', text: 'Oppressus builds its prison district on the Swedish model of rehabilitation. (Year 126 AC)' },
      { year: 2364, kind: 'oppressus', title: 'Malum Rec slips out of control', text: 'The government stops entering the dark valley of Malum Rec for fear of a revolt. (Year 158 AC)' },
      { year: 2389, kind: 'oppressus', title: 'Fugitives settle Nullus Sol', text: 'People fleeing punishment hide in the hot, humid old oil field. (Year 183 AC)' },
      { year: 2411, kind: 'oppressus', title: 'The Cura Aliud coast is abandoned', text: 'After too many people disappear on its waters, the shores of Cura Aliud are left empty. (Year 205 AC)' },
      { year: 2460, kind: 'science', title: 'The rebound slows', text: 'Most of the land has risen back to its natural height.' },

      // ---- more real-world context (kind: science = a real fact or real projection)
      { year: 2031, kind: 'science', title: 'Thwaites, the "Doomsday Glacier"', text: 'Real fact: Thwaites Glacier in West Antarctica holds enough ice to raise sea level by about 65 cm, and scientists have warned that its floating ice shelf could break apart. In this story, it does.' },
      { year: 2036, kind: 'science', title: 'Larsen C collapses', text: 'Real fact: the Larsen B ice shelf shattered in just a few weeks in 2002, and Larsen C released one of the largest icebergs ever recorded in 2017. In this story, the rest of Larsen C follows.' },
      { year: 2050, kind: 'world', title: 'The net-zero deadline passes', text: 'Real fact: many countries promised to reach "net zero" carbon emissions by 2050. In this story, the oil rush keeps that promise from being met.' },
      { year: 2059, kind: 'world', title: 'The Antarctic Treaty turns 100', text: 'Real fact: the Antarctic Treaty was signed by 12 nations on December 1, 1959, setting Antarctica aside for peace and science.' },
      { year: 2066, kind: 'science', title: 'The ozone hole heals', text: 'Real projection: thanks to the 1987 Montreal Protocol, scientists expect the ozone hole over Antarctica to recover by about 2066, one environmental problem the world did solve.' },
      { year: 2084, kind: 'science', title: 'The emperor penguins disappear', text: 'Real projection: studies warn that most emperor penguin colonies could vanish by 2100 if the sea ice they breed on keeps shrinking.' },
      { year: 2097, kind: 'world', title: 'The research stations are evacuated', text: 'As the ice sheet becomes unstable, the old research stations are abandoned one by one.' },
      { year: 2100, kind: 'science', title: 'Real-world projections for 2100', text: 'Real fact: the IPCC projects that by 2100 global sea level will rise somewhere between about 0.3 and 1 meter, depending on emissions. The melt in this story is far faster than any real projection.' },
      { year: 2112, kind: 'science', title: 'Antarctica turns green', text: 'Real fact: Antarctica has only two native flowering plants, Antarctic hair grass and Antarctic pearlwort. On the newly uncovered rock, they and the mosses begin to spread.' },
      { year: 2126, kind: 'world', title: 'Ships of refugees arrive', text: 'People who have lost their homes to the rising seas begin sailing south to the newly uncovered land.' },
      { year: 2181, kind: 'world', title: 'Carbon from the air', text: 'The researchers of the facility begin recycling carbon dioxide into useful carbon products, the beginning of an industry Oppressus still depends on.' },
      { year: 2196, kind: 'world', title: 'Copper in the mountains', text: 'Survey teams from the facility find rich copper, gold and silver ore in the eastern mountains, where Sovalus will one day stand.' },

      // ---- miscellaneous Oppressan milestones (years are invented; the customs are from the source files)
      { year: 2208, kind: 'oppressus', title: 'The first Dies Creationis', text: 'One year after Cilla entered the first vessel, the Day of Creation is celebrated for the first time. Every home lights a candle for Cilla\'s gift of fire. (Year 2 AC)' },
      { year: 2212, kind: 'oppressus', title: 'Latin becomes the official language', text: 'Latin is made the language of Oppressus, written in Latin letters with ordinary digits. English and Russian remain common second languages. (Year 6 AC)' },
      { year: 2215, kind: 'oppressus', title: 'The first copper-stamped money', text: 'Paper notes marked with a copper stamp are printed in five values: Unus, Quinque, Decem, Viginti and Centum. (Year 9 AC)' },
      { year: 2218, kind: 'oppressus', title: 'Mount Veston becomes a Royal Zone', text: 'The whole mountain of Cilla\'s cave is closed to everyone but its guards. (Year 12 AC)' },
      { year: 2221, kind: 'oppressus', title: 'The tithe to Cilla', text: 'Every citizen is asked to give 1% of all their wealth to Cilla. (Year 15 AC)' },
      { year: 2231, kind: 'oppressus', title: 'The first laws', text: 'Cilla\'s laws are written down: do not murder, do not assault, do not steal, do not attack wildlife, and keep out of the Royal Zones. (Year 25 AC)' },
      { year: 2250, kind: 'oppressus', title: 'No death penalty', text: 'Oppressus forbids the death penalty and all physical punishment. Charges are graded Primus, Quintis and Decimus (I, V and X). (Year 44 AC)' },
      { year: 2258, kind: 'oppressus', title: 'A volunteer army', text: 'Joining the military becomes a free choice, except that every war begins a draft of all 20- and 21-year-olds. (Year 52 AC)' },
      { year: 2277, kind: 'oppressus', title: 'The first timber ships', text: 'With so little wood of its own, Oppressus begins importing timber through the Corton Sea. (Year 71 AC)' },
      { year: 2316, kind: 'oppressus', title: 'Dollars and rubles accepted', text: 'The treasuries begin exchanging U.S. dollars and Russian rubles for Oppressan notes. (Year 110 AC)' },
      { year: 2336, kind: 'oppressus', title: 'Incarculuss is built', text: 'The white-room prison is built near the edge of Nullus Sol, as a replacement for the death penalty. (Year 130 AC)' },
      { year: 2406, kind: 'oppressus', title: 'Debit cards spread', text: 'Digital money on debit cards becomes as common as the copper-stamped notes. (Year 200 AC)' },
      { year: 2518, kind: 'oppressus', title: 'The present', text: 'Year 312 AC. Oppressus is home to about 28 million people.' },
    ],

    // Real research stations (shown at the start of the timeline). Positions are latitude/longitude.
    stations: [
      { name: 'McMurdo Station', country: 'United States', lat: -77.846, lon: 166.676 },
      { name: 'Amundsen–Scott South Pole Station', country: 'United States', lat: -89.99, lon: 0 },
      { name: 'Vostok Station', country: 'Russia', lat: -78.464, lon: 106.837 },
      { name: 'Mirny Station', country: 'Russia', lat: -66.553, lon: 93.010 },
      { name: 'Zhongshan Station', country: 'China', lat: -69.373, lon: 76.372 },
      { name: 'Kunlun Station', country: 'China', lat: -80.417, lon: 77.117 },
      { name: 'Rothera Station', country: 'United Kingdom', lat: -67.568, lon: -68.125 },
    ],

    // The oil rush (positions are map pixels; the fields themselves are invented for the simulation).
    // Most rigs drilled the sea floor just off the ice edge; the Queen Mary Land field was drilled on land
    // as soon as the ice uncovered it, and its old wells became Nullus Sol.
    oilFields: [
      { name: 'Ross Sea Field', country: 'United States', pos: [1177, 1312], built: 2052 },
      { name: 'Weddell Field', country: 'United States', pos: [853, 700], built: 2061 },
      { name: 'Prydz Bay Field', country: 'China', pos: [1936, 679], built: 2055 },
      { name: 'Wilkes Field', country: 'China', pos: [1618, 1591], built: 2066 },
      { name: 'Queen Mary Land Field', country: 'Russia', pos: [1975, 1095], built: 2143, later: 'Nullus Sol' },
      { name: 'Coats Land Field', country: 'Russia', pos: [907, 316], built: 2058 },
    ],
    oilEnd: 2173,

    facility: { name: 'The Polaris Facility', pos: [1219, 769], built: 2170, abandoned: 2290, invented: true,
      description: 'A giant research facility built to find a way to stop the damage. Its researchers took down the oil fields. Some say the fallen towers of Litus Desertum, nearby on the Cura Aliud coast, were once part of it.' },
  },

  // ------------------------------------------------------------------ REAL GEOGRAPHY LABELS
  // kind: ocean | sea | land | mountains | region   minZoom: 1 = whole map, higher = only when zoomed in
  features: [
    { name: 'Southern Ocean', kind: 'ocean', pos: [1900, 1780], minZoom: 1 },
    { name: 'Southern Ocean', kind: 'ocean', pos: [300, 1750], minZoom: 1 },
    { name: 'Weddell Sea', kind: 'sea', pos: [700, 640], minZoom: 1 },
    { name: 'Ross Sea', kind: 'sea', pos: [1080, 1440], minZoom: 1 },
    { name: 'Amundsen Sea', kind: 'sea', pos: [430, 1560], minZoom: 1.4 },
    { name: 'Bellingshausen Sea', kind: 'sea', pos: [200, 860], minZoom: 1.4 },
    { name: 'Lambert Gulf', kind: 'sea', pos: [1745, 690], minZoom: 2.2 },
    { name: 'WEST ANTARCTICA', kind: 'region', pos: [480, 1250], minZoom: 1 },
    { name: 'EAST ANTARCTICA', kind: 'region', pos: [1880, 220], minZoom: 1 },
    { name: 'Antarctic Peninsula', kind: 'land', pos: [381, 638], angle: 38, minZoom: 1.3 },
    { name: 'Transantarctic Mountains', kind: 'mountains', pos: [1180, 1210], angle: 52, minZoom: 1 },
    { name: 'Gamburtsev Mountains', kind: 'mountains', pos: [1545, 800], minZoom: 2.2 },
    { name: 'Dronning Maud Land', kind: 'land', pos: [1250, 250], minZoom: 1.8 },
    { name: 'Marie Byrd Land', kind: 'land', pos: [700, 1380], minZoom: 1.8 },
    { name: 'Victoria Land', kind: 'land', pos: [1342, 1627], angle: 60, minZoom: 1.8 },
    { name: 'Wilkes Basin (flooded)', kind: 'sea', pos: [1780, 1300], minZoom: 2.2 },
  ],
};
