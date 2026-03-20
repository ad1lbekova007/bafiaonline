import App from '../App';
import { Role, Sex } from '../enums';
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import Box from './Box';
import fs from '../../../core/src/fs/fs';
import { getAvatarImg, getTexture } from '../utils/Resources';
import { getZoom, wait } from '../../../core/src/utils/utils';
import Rooms from '../screen/Rooms';
import { formatDate } from '../../../core/src/utils/format';
import MessageBox from './MessageBox';
import ConfirmBox from './ConfirmBox';
import PrivateChat from '../screen/PrivateChat';
import { createElement } from '../../../core/src/utils/DOM';

function calculateStatsWithRoles(profile: any) {
  const mafiaRoles = [Role.MAFIA, Role.TERRORIST, Role.BARMAN, Role.INFORMER];
  const peacefulRoles = [Role.CIVILIAN, Role.DOCTOR, Role.SHERIFF, Role.LOVER, Role.JOURNALIST, Role.BODYGUARD, Role.SPY];

  let gamesAsMafia = 0;
  let gamesAsPeaceful = 0;

  mafiaRoles.forEach(roleId => {
    gamesAsMafia += profile.roleStats[roleId] || 0;
  });

  peacefulRoles.forEach(roleId => {
    gamesAsPeaceful += profile.roleStats[roleId] || 0;
  });

  const totalGamesFromRoles = gamesAsMafia + gamesAsPeaceful;
  const totalWins = profile.winsAsPeaceful + profile.winsAsMafia;

  const overallWinRate = (totalWins * 100 / profile.playedGames).toFixed(2);

  const mafiaWinRatePercentOfTotalWins = (profile.winsAsMafia * 100 / totalWins).toFixed(1);
  const peacefulWinRatePercentOfTotalWins = (profile.winsAsPeaceful * 100 / totalWins).toFixed(1);

  const mafiaWinRatePercentOfGamesAsMafia = gamesAsMafia > 0 ? Math.round(profile.winsAsMafia * 100 / gamesAsMafia) : 0;
  const peacefulWinRatePercentOfGamesAsPeaceful = gamesAsPeaceful > 0 ? Math.round(profile.winsAsPeaceful * 100 / gamesAsPeaceful) : 0;

  return {
    totalWins: `(${overallWinRate}%) ${totalWins}`,
    winsAsMafia: `(${mafiaWinRatePercentOfTotalWins}%) ${profile.winsAsMafia}`,
    winsAsPeaceful: `(${peacefulWinRatePercentOfTotalWins}%) ${profile.winsAsPeaceful}`,

    gamesAsMafia,
    gamesAsPeaceful,
    mafiaWinRatePercentOfGamesAsMafia, // ≈41%
    peacefulWinRatePercentOfGamesAsPeaceful // ≈47%
  };
}

export default async function ProfileInfo(playerObjectId: string){
  App.server.send(PacketDataKeys.GET_USER_PROFILE, {
    [PacketDataKeys.USER_RECEIVER]: playerObjectId,
    [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
    [PacketDataKeys.TOKEN]: App.user.token
  });
  let data;
  try {
    data = await App.server.awaitPacket(PacketDataKeys.USER_PROFILE, 3000);
  }catch{
    return;
  }

  const zoom = getZoom();
  const box = new Box({ title: 'ПРОФИЛЬ', width: (App.width/zoom)/.85, height: (App.height/zoom)/.75, canCloseAnywhere: true });
  // box.element.style.zoom = (zoom / 1.75) + '';

  box.content.style.overflowY = 'overlay';

  const ud = data[PacketDataKeys.USER_PROFILE];
  const room = ud[PacketDataKeys.ROOM];
  const pud = ud[PacketDataKeys.PROFILE_USER_DATA];
  const profile = {
    isOnline: pud[PacketDataKeys.IS_ONLINE],
    experience: pud[PacketDataKeys.EXPERIENCE],
    level: pud[PacketDataKeys.LEVEL],
    matchMakingScore: pud[PacketDataKeys.MATCH_MAKING_SCORE],
    nextLevelExperience: pud[PacketDataKeys.NEXT_LEVEL_EXPERIENCE],
    prevLevelExperience: pud[PacketDataKeys.PREVIOUS_LEVEL_EXPERIENCE],
    objectId: pud[PacketDataKeys.OBJECT_ID],
    playerObjectId: pud[PacketDataKeys.PLAYER_OBJECT_ID],
    photo: pud[PacketDataKeys.PHOTO],
    roleStats: pud[PacketDataKeys.PLAYER_ROLE_STATISTICS],
    sex: pud[PacketDataKeys.SEX],
    playedGames: pud[PacketDataKeys.PLAYED_GAMES],
    serverLanguage: pud[PacketDataKeys.SERVER_LANGUAGE],
    status: pud[PacketDataKeys.STATUS],
    updated: pud[PacketDataKeys.UPDATED],
    username: pud[PacketDataKeys.USERNAME],
    vip: pud[PacketDataKeys.VIP],
    winsAsMafia: pud[PacketDataKeys.WINS_AS_MAFIA],
    winsAsPeaceful: pud[PacketDataKeys.WINS_AS_PEACEFUL],

    sliver: ud[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.SILVER_COINS],
    gold: ud[PacketDataKeys.USER_ACCOUNT_COINS][PacketDataKeys.GOLD_COINS],

    friend: ud[PacketDataKeys.FRIENDSHIP],
    friendFlag: ud[PacketDataKeys.FRIENDSHIP_FLAG]
  }

  const isMe = profile.playerObjectId == App.user.playerObjectId;

  let isViewingAvatar = false;

  const div = createElement('div', {
    css: {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      overflowY: 'overlay',
      fontSize: 'smaller'
    }
  });

  const rankEl = createElement('div', {
    css: {
      display: 'flex',
      width: '100%',
      padding: '10px',
      alignItems: 'center',
      color: 'black'
    },
    appendTo: div
  });
  const rankImg = createElement('img', {
    width: 20,
    appendTo: rankEl,
  });
  getTexture(`rank/rank${Math.round(profile.level / 2)}_36.png`).then(e => rankImg.src = e);
  const rankLvl = createElement('span', { text: profile.level + '', appendTo: rankEl });
  const rankProgress = createElement('progress', {
    css: {
      width: `calc(100% - 140px)`,
      margin: '5px'
    },
    value: '0',
    appendTo: rankEl
  });
  rankProgress.max = profile.nextLevelExperience;
  rankProgress.value = profile.prevLevelExperience;
  const rankLvl2 = createElement('span', { appendTo: rankEl, text: `${profile.prevLevelExperience}/${profile.nextLevelExperience}` });

  const badge = createElement('div', {
    css: {
      width: '20px',
      minWidth: '20px',
      minHeight: '20px',
      maxWidth: '20px',
      maxHeight: '20px',
      boxSizing: 'border-box',
      background: profile.isOnline ? '#3fe33f' : '#636363',
      border: '2px solid white',
      borderRadius: '100px',
      position: 'relative',
      left: '-40px',
      top: '-80px'
    }
  });
  const avatar = createElement('img', {
    css: {
      borderRadius: '100%',
      margin: '5px',
      transition: '.5s',
      marginBottom: '-10px'
    },
    width: 100,
    height: 100
  });
  getAvatarImg(pud).then(e => avatar.src = e);
  avatar.onmousedown = e => e.preventDefault();
  avatar.onclick = () => {
    const zoom = getZoom();
    if(isViewingAvatar){
      avatar.style.position = 'static';
      avatar.style.width = ''
      avatar.style.height = ''
      avatar.style.borderRadius = '100%';
      wait(500).then(() => badge.style.display = 'block');
    } else {
      avatar.style.position = 'relative';
      avatar.style.width = (App.width/zoom)/1.75 + 'px';
      avatar.style.height = (App.width/zoom)/1.75 + 'px';
      avatar.style.borderRadius = '0'
      badge.style.display = 'none';
    }
    isViewingAvatar = !isViewingAvatar;
  }
  div.appendChild(avatar);
  div.appendChild(badge);

  function addH(text: string, userSelect = false){
    const h = document.createElement('h4');
    if(userSelect) h.style.userSelect = 'text';
    h.style.color = 'black';
    h.style.margin = '5px';
    h.textContent = text;
    div.appendChild(h);
  }

  addH(profile.username, true);

  const btns = document.createElement('div');
  btns.style.width = '80%';
  btns.style.textAlign = 'center';
  div.appendChild(btns);
  function addButton(text: string, callback?: (this: GlobalEventHandlers, ev: PointerEvent) => any){
    const e = document.createElement('button');
    e.style.margin = '1px';
    e.textContent = text;
    if(callback) e.onclick = callback;
    else e.disabled = true
    btns.appendChild(e);
  }

  if(!isMe) {
    if(!profile.friend){
      addButton('Добавить в друзья', async() => {
        const e = await ConfirmBox(`Отправить заявку на добавление данного пользователя в друзья?`, { title: `ДОБАВИТЬ В ДРУЗЬЯ` });
        if(e){
          App.server.send(PacketDataKeys.ADD_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.ADD_FRIEND, PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL){
            MessageBox(`Список ваших друзей полон. Вы уже добавили ${data[PacketDataKeys.FRIENDSHIP_LIST_LIMIT]} друзей в список друзей\n\nВы сможете добавить 200 друзей, если подключите VIP\n\nПожалуйста, освободите список ваших друзей`);
            return;
          }
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.ADD_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
    } else if(profile.friendFlag == 2){
      addButton('Принять дружбу', async() => {
        const e = await ConfirmBox(`Принять заявку в друзья от данного пользователя`, { title: `ПРИНЯТЬ ДРУЖБУ` });
        if(e) {
          App.server.send(PacketDataKeys.ADD_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.ADD_FRIEND, PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.YOUR_FRIENDSHIP_LIST_FULL){
            MessageBox(`Список ваших друзей полон. Вы уже добавили ${data[PacketDataKeys.FRIENDSHIP_LIST_LIMIT]} друзей в список друзей\n\nВы сможете добавить 200 друзей, если подключите VIP\n\nПожалуйста, освободите список ваших друзей`);
            return;
          }
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.ADD_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
    } else if(profile.friendFlag == 1) {
      addButton('Отменить запрос', async() => {
        const e = await ConfirmBox(`Отменить запрос дружбы?`, { title: `ОТМЕНИТЬ ЗАПРОС` });
        if(e) {
          App.server.send(PacketDataKeys.REMOVE_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.REMOVE_FRIEND]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
    } if(profile.friendFlag == 3) {
      addButton('Отменить дружбу', async() => {
        const e = await ConfirmBox(`Удалить данного пользователя из друзей? Все личные сообщения так-же будут удалены.`, { title: `УДАЛИТЬ ИЗ ДРУЗЕЙ`, height: 175 });
        if(e) {
          App.server.send(PacketDataKeys.REMOVE_FRIEND, {
            [PacketDataKeys.FRIEND_USER_OBJECT_ID]: playerObjectId
          });
          const data = await App.server.awaitPacket([PacketDataKeys.REMOVE_FRIEND]);
          if(data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE_FRIEND){
            box.destroy();
            ProfileInfo(playerObjectId);
          }
        }
      });
      addButton('Личные сообщения', async()=>{
        box.destroy();
        App.screen = new PrivateChat(profile.friend, playerObjectId, pud);
      });
    }
  }

  if(room){
    if(room[PacketDataKeys.SAME_ROOM] && !isMe)
      addButton('Выгнать', async() => {
        const c = await ConfirmBox(`Если все проголосуют за исключение игрока из комнаты, это будет стоить вам 200 серебряных монет`, { title: `ВЫГНАТЬ ИГРОКА`, height: 180 });
        if(c){
          App.server.send(PacketDataKeys.KICK_USER, {
            [PacketDataKeys.ROOM_OBJECT_ID]: room[PacketDataKeys.OBJECT_ID],
            [PacketDataKeys.USER_OBJECT_ID]: playerObjectId
          });
          box.destroy();
        }
      });
    addH(`Сейчас играет в комнате`);
    const roomElem = Rooms.getRoomElement(room);
    roomElem.onJoin(() => box.close());
    roomElem.elem.style.width = '90%';
    div.appendChild(roomElem.elem);
  }
  if(!isMe) addButton('Подать жалобу');

  addH(`Статистика`);

  const stat = document.createElement('div');
  stat.style.display = 'flex';
  stat.style.flexDirection = 'column';
  stat.style.alignItems = 'stretch';
  stat.style.width = '95%';
  div.appendChild(stat);
  function add(stat: HTMLElement, text: string, value: any){
    const d = document.createElement('div');
    d.style.color = 'black';
    d.style.background = 'rgb(189 184 184)';
    d.style.padding = '5px';
    d.style.margin = '1px';
    d.style.borderRadius = '5px'
    const k = document.createElement('span');
    k.textContent = `${text}:`;
    const v = document.createElement('span');
    v.textContent = value;
    v.style.float = 'right'
    v.style.userSelect = 'text';
    d.appendChild(k);
    d.appendChild(v);
    stat.appendChild(d);
  }

  const dataStats = calculateStatsWithRoles(profile);

  add(stat, 'Сыграно игр', profile.playedGames);
  add(stat, 'Сыграно игр за Мафию', dataStats.gamesAsMafia);
  add(stat, 'Сыграно игр за Мирных', dataStats.gamesAsPeaceful);
  add(stat, 'Всего побед', dataStats.totalWins);
  add(stat, 'Побед за Мафию', dataStats.winsAsMafia);
  add(stat, 'Побед за Мирных', dataStats.winsAsPeaceful);
  add(stat, 'M/M', (Number(profile.winsAsPeaceful) / Number(profile.winsAsMafia)).toFixed(2));

  addH(`Сыгранные роли`);
  const statRoles = document.createElement('div');
  statRoles.style.display = 'flex';
  statRoles.style.flexDirection = 'row';
  statRoles.style.flexWrap = 'wrap';
  statRoles.style.alignItems = 'stretch';
  statRoles.style.justifyContent = 'center';
  statRoles.style.width = '95%';
  function addRole(id: number){
    const d = document.createElement('div');
    d.style.color = 'black';
    d.style.background = 'rgb(189 184 184)';
    d.style.padding = '5px';
    d.style.margin = '1px';
    d.style.borderRadius = '5px'
    const img = document.createElement('img');
    fs.loadImageAsDataURL(`${App.config.path}/assets/textures/roles/${id}.png`).then(e => img.src = e);
    img.width = 40;
    img.height = 55;
    img.onmousedown = e => e.preventDefault();
    const v = document.createElement('div');
    v.textContent = profile.roleStats[id];
    v.style.textAlign = 'center';
    d.appendChild(img);
    d.appendChild(v);
    statRoles.appendChild(d);
  }
  div.appendChild(statRoles);
  for(let i=1;i<11;i++) addRole(i);

  addH(`Подробная информация`);

  const statDev = document.createElement('div');
  statDev.style.display = 'flex';
  statDev.style.flexDirection = 'column';
  statDev.style.alignItems = 'stretch';
  statDev.style.width = '95%';

  add(statDev, 'Серебро', profile.sliver);
  if(typeof profile.gold == 'number') add(statDev, 'Золото', profile.gold);
  add(statDev, 'Пол', profile.sex == Sex.WOMEN ? 'Женский' : 'Мужской');
  add(statDev, 'Уровень', profile.level + ` (${profile.prevLevelExperience}/${profile.nextLevelExperience})`);

  add(statDev, `player object id`, playerObjectId);
  // add(statDev, `Последний вход`, formatDate(profile.updated));
  // add(statDev, `Сервер`, profile.serverLanguage);
  div.appendChild(statDev);

  box.content.appendChild(div);

  return await box.wait('destroy');
}
