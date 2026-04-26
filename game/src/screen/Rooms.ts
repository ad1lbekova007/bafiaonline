import fs from "../../../core/src/fs/fs";
import App from "../App";
import PromptBox from "../dialog/PromptBox";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import { getBackgroundImg, getRoleImg, getTexture } from "../utils/Resources";
import Dashboard from "./Dashboard";
import GlobalChat from "./GlobalChat";
import Room from "./Room";
import Screen from "./Screen";
import Box from "../dialog/Box";
import MessageBox from "../dialog/MessageBox";
import ContextMenu from "../component/ContextMenu";
import { when } from "../../../core/src/utils/TypeScript";
import LoadingBox from "../dialog/LoadingBox";
import { noXSS, wait } from "../../../core/src/utils/utils";
import RoomCreation from "./RoomCreation";
import md5salt from "../../../core/src/utils/md5";
import format, { formatDate } from "../../../core/src/utils/format";
import ConfirmBox from "../dialog/ConfirmBox";
import { History } from "./History";
import RoomPlayers from "../dialog/RoomPlayers";
import { createElement } from "../../../core/src/utils/DOM";

export default class Rooms extends Screen {
  div!: HTMLDivElement
  titleElem: HTMLLabelElement

  search = ""

  constructor(){
    super('Rooms');

    App.title = 'Комнаты';

    this.element.style.overflow = 'hidden';
    (async()=> this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

    const header = document.createElement('div');
    header.className = 'header';
    this.element.appendChild(header);
    const back = document.createElement('button');
    back.className = 'back';
    back.onclick = () => this.emit('back');
    header.appendChild(back);
    const backImg = document.createElement('img');
    backImg.width = 24;
    getTexture(`ui/Jb.png`).then(e => backImg.src = e);
    back.appendChild(backImg);
    this.titleElem = document.createElement('label');
    this.titleElem.textContent = 'Комнаты';
    header.appendChild(this.titleElem);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  async reconnect() {
    super.reconnect();

    this.rooms = [];
    this.updateRooms();
    App.server.send(PacketDataKeys.ADD_CLIENT_TO_ROOMS_LIST, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });
    const data = await App.server.awaitPacket(PacketDataKeys.ROOMS);
    const rooms = this.getRooms(data[PacketDataKeys.ROOMS]);
    for(const room of rooms) this.addRoom(room);
  }

  async init(){
    App.server.send(PacketDataKeys.ADD_CLIENT_TO_ROOMS_LIST, {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });
    // const loading = LoadingBox();
    const data = await App.server.awaitPacket(PacketDataKeys.ROOMS);
    // loading.done();

    const filterElem = document.createElement('div');
    filterElem.className = 'rooms-filter';
    this.element.appendChild(filterElem);
    {
      const inputSearch = document.createElement('input');
      inputSearch.placeholder = 'Поиск';
      inputSearch.size = 30;
      inputSearch.onchange = inputSearch.onkeyup = () => {
        this.search = inputSearch.value;
        this.updateRooms();
      }
      filterElem.appendChild(inputSearch);

      const updateBtn = document.createElement('button');
      updateBtn.textContent = `Обновить`;
      updateBtn.onclick = async() => {
        this.rooms = [];
        this.updateRooms();
        App.server.send(PacketDataKeys.ADD_CLIENT_TO_ROOMS_LIST, {
          [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
          [PacketDataKeys.TOKEN]: App.user.token
        });
        const data = await App.server.awaitPacket(PacketDataKeys.ROOMS);
        const rooms = this.getRooms(data[PacketDataKeys.ROOMS]);
        for(const room of rooms) this.addRoom(room);
      }
      filterElem.appendChild(updateBtn);

      const filterBtn = document.createElement('button');
      filterBtn.textContent = `Фильтр`;
      filterBtn.onclick = () => {
        MessageBox('Скоро..');
        // const box = new Box({ title: 'ФИЛЬТР', width: 150, height: 150, canCloseAnywhere: true });
      }
      filterElem.appendChild(filterBtn);

      const sortBtn = document.createElement('button');
      sortBtn.textContent = `Сортировка`;
      sortBtn.onclick = () => {
        MessageBox('Скоро..');
        // const box = new Box({ title: 'СОРТИРОВКА', width: 150, height: 150, canCloseAnywhere: true });
      }
      filterElem.appendChild(sortBtn);

      this.on('keydown', e => {
        if(e.ctrlKey && e.key == 'f'){
          inputSearch.focus();
          e.preventDefault();
        }
      });
    }

    this.div = document.createElement('div');
    this.div.style.textAlign = 'center';
    this.div.style.overflowY = 'overlay';
    this.div.style.height = (App.height - (95 + filterElem.clientHeight)) + 'px';
    this.element.appendChild(this.div);

    const rooms = this.getRooms(data[PacketDataKeys.ROOMS]);
    for(const room of rooms) this.addRoom(room);

    const divBtns = document.createElement('div');
    divBtns.style.textAlign = 'center';
    divBtns.style.margin = '3px'
    this.element.appendChild(divBtns);

    const btnCreateRoom = document.createElement('button');
    btnCreateRoom.textContent = 'Создать комнату';
    btnCreateRoom.style.width = '99%';
    btnCreateRoom.onclick = () => App.screen = new RoomCreation();
    divBtns.appendChild(btnCreateRoom);

    this.on('message', data => {
      if(data[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_IN_LOBBY_STATE){
        // this.rooms[data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID]].rils(data[PacketDataKeys.ROOM_IN_LOBBY_STATE]);
        // this.rooms[data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID]].room[PacketDataKeys.PLAYERS_NUM] = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.PLAYERS_IN_ROOM];
        // this.updateRooms();

        // this.getRoomByObjectId(data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID])!.room[PacketDataKeys.PLAYERS_NUM] = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.PLAYERS_IN_ROOM];
        // this.updateRooms();

        this.getRoomByObjectId(data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID])?.rils(data[PacketDataKeys.ROOM_IN_LOBBY_STATE]);
        this.updateRooms();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_STATUS_IN_ROOMS_LIST){
        // this.rooms[data[PacketDataKeys.ROOM_OBJECT_ID]].room.status = data[PacketDataKeys.STATUS];
        // this.updateRooms();

        this.getRoomByObjectId(data[PacketDataKeys.ROOM_OBJECT_ID])!.room.status = data[PacketDataKeys.STATUS];
        this.updateRooms();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.ADD){
        this.addRoom(data[PacketDataKeys.ROOM]);
        this.updateRooms();
      } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.REMOVE){
        this.getRoomByObjectId(data[PacketDataKeys.ROOM_OBJECT_ID])?.remove();
        this.rooms.splice(this.getRoomIdByObjectId(data[PacketDataKeys.ROOM_OBJECT_ID]), 1);
        // this.rooms[data[PacketDataKeys.ROOM_OBJECT_ID]].remove();
        // delete this.rooms[data[PacketDataKeys.ROOM_OBJECT_ID]];
        this.updateRooms();
      }
    });

    this.on('resize', e => {
      this.div.style.height = (App.height - (85 + filterElem.clientHeight + 5)) + 'px';
    });
  }

  // <ROOM_OBJECT_ID, data>
  rooms: ({ id: number, room: any, rils: (data: any) => void, remove: () => void })[] = []
  roomsId = 0

  getRoomByObjectId(objectId: string){
    return this.rooms.find(e => e.room[PacketDataKeys.OBJECT_ID] == objectId);
  }
  getRoomIdByObjectId(objectId: string){
    return this.rooms.findIndex(e => e.room[PacketDataKeys.OBJECT_ID] == objectId);
  }

  getRooms(data: any){
    const rooms = (data as any[]).sort((a, b) => {
      // 1. Сначала сортируем по ROOM_STATUS
      const roomStatusDiff = a[PacketDataKeys.ROOM_STATUS] - b[PacketDataKeys.ROOM_STATUS];
      if(roomStatusDiff !== 0) return roomStatusDiff;

      // 2. Затем по STATUS
      const statusDiff = a[PacketDataKeys.STATUS] - b[PacketDataKeys.STATUS];
      if(statusDiff !== 0) return statusDiff;

      // 3. Наконец по MIN_LEVEL
      return a[PacketDataKeys.MIN_LEVEL] - b[PacketDataKeys.MIN_LEVEL];
    });

    const title = `Комнаты: (${(data as any[]).length}/${rooms.length})`
    this.titleElem.textContent = noXSS(title);
    App.title = title;

    return rooms;
  }

  updateRooms(){
    this.div.innerHTML = '';
    let roomsData = [];
    // for(let i in this.rooms){
    //     const room = this.rooms[i];
    //     roomsData.unshift(room.room);
    //     // roomsData.push(room.room);
    //     // room.remove();
    //     // delete this.rooms[i];
    // }
    // for(let i in this.rooms) delete this.rooms[i];
    for(let room of this.rooms) roomsData.push(room.room);

    const rooms = this.getRooms(roomsData);

    // this.rooms = {};
    this.rooms = [];
    for(const room of rooms) {
      this.addRoom(Object.assign({}, room));
    }
  }

  filter(room: any): boolean{
    if(!room) return false;
    const search = this.search == '' ? true : (room[PacketDataKeys.TITLE] as string).toLowerCase().includes(this.search.toLowerCase());

    return search;
  }

  static orderRoles = [2, 7, 10, 11, 9, 5, 6, 8];
  static getRoomElement(room: any): {
    elem: HTMLDivElement
    onJoin: (callback: Function) => void
    onViewRoomPlayers: (callback: Function) => void
  } {
    const isHistory = typeof room.isHistory == 'boolean' && room.isHistory;
    const isProfileInfo = typeof room[PacketDataKeys.SAME_ROOM] == 'boolean';
    const objectId = room[PacketDataKeys.OBJECT_ID];
    const level = room[PacketDataKeys.MIN_LEVEL];
    const myStatus = typeof room.status == 'number' ? room.status : isProfileInfo ? 2 : room[PacketDataKeys.ROOM_STATUS];
    const statusText = room.statusText;
    const rank = level == 3 ? 2 : level == 5 ? 3 : level == 7 ? 4 : level == 9 ? 5 : level == 11 ? 6 : 1;
    const selectedRoles = room[PacketDataKeys.SELECTED_ROLES] ?? [];
    const hasPassword = room[PacketDataKeys.PASSWORD];
    const friends = room[PacketDataKeys.FRIEND_IN_ROOM];

    let clickType = '';
    let joinCallback: Function = () => {}
    let viewRoomPlayersCallback: Function = () => {}

    async function join() {
      await new Promise(res => setTimeout(res, 0));
      if(clickType) {
        viewRoomPlayersCallback();
        RoomPlayers(objectId);
        clickType = '';
        return;
      }
      joinCallback();
      if(hasPassword) {
        let password = await PromptBox(`Эта комната под замком\n\nПожалуйста введите пароль`, { btnText: `Применить`, placeholder: `Пароль`, title: 'ВВЕСТИ ПАРОЛЬ', height: 200 });
        if(password == '') return;

        App.server.send(PacketDataKeys.ROOM_ENTER, {
          [PacketDataKeys.ROOM_PASS]: md5salt(password),
          [PacketDataKeys.ROOM_OBJECT_ID]: objectId
        });
        const rData = await App.server.awaitPacket([PacketDataKeys.ROOM_ENTER, PacketDataKeys.ROOM_PASSWORD_IS_WRONG_ERROR, PacketDataKeys.GAME_STARTED, PacketDataKeys.USER_IN_ANOTHER_ROOM, PacketDataKeys.USER_USING_DOUBLE_ACCOUNT, PacketDataKeys.USER_LEVEL_NOT_ENOUGH, PacketDataKeys.USER_KICKED]);
        if(rData[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_PASSWORD_IS_WRONG_ERROR){
          await MessageBox('Неправильный пароль!');
          join();
          return;
        }
        App.screen = new Room(objectId, { password, sendRoomEnter: true });
        return;
      }
      if(isHistory) {
        App.screen = new Room(objectId, { isHistory, data: room.data });
      } else {
        App.screen = new Room(objectId);
      }
    }

    const div = document.createElement('div');
    div.className = 'room';
    const levelImg = document.createElement('img');
    levelImg.className = 'room-lvl'
    const title = document.createElement('div');
    title.className = 'room-title'
    const status = document.createElement('div');
    status.className = 'room-status'
    const btnPlayers = document.createElement('div');
    btnPlayers.className = 'room-btn-players'
    if(myStatus == 0){
      const text = document.createElement('div');
      text.className = 'black';
      text.style.textAlign = 'center';
      text.style.padding = '5px';
      text.textContent = statusText ?? `Вы играете в этой комнате`;
      div.appendChild(text);
    } else if(myStatus == 1){
      const text = document.createElement('div');
      text.className = 'black';
      text.style.textAlign = 'center';
      text.style.padding = '5px';
      text.textContent = statusText ?? `Вас убили в этой комнате`;
      div.appendChild(text);
    }
    div.style.background = myStatus == 0 ? 'rgb(137 242 165 / 40%)' : myStatus == 1 ? 'rgb(255 138 146 / 40%)' : 'rgba(200,200,200,.4)';
    if(selectedRoles.length == 0) div.style.height = myStatus < 2 ? '110px' : '80px';
    div.onmouseenter = () => myStatus == 0 ? 'rgb(114 202 137 / 40%)' : myStatus == 1 ? 'rgb(219 103 111 / 40%)' : div.style.background = 'rgba(200,200,200,.3)';
    div.onmouseleave = () => myStatus == 0 ? 'rgb(137 242 165 / 40%)' : myStatus == 1 ? 'rgb(255 138 146 / 40%)' : div.style.background = 'rgba(200,200,200,.4)';
    div.onclick = () => join();
    if(!isProfileInfo) div.oncontextmenu = async(e)=>{
      e.preventDefault();
      const joinPl = `Зайти, когда ${room[PacketDataKeys.MAX_PLAYERS]-1} игроков будет`;
      const cx = new ContextMenu(isHistory ? ['Посмотреть', 'Удалить'] : ['Зайти',joinPl,'Скопировать object id'], e);
      const result = await cx.waitForResult();
      when(result)
        .case(joinPl, async() => {
          const loading = LoadingBox({ title: 'ЖДЁМ', text: `Кол-во игроков в комнате: ${room[PacketDataKeys.PLAYERS_NUM]}`, canCloseAnywhere: true });
          const maxPl = room[PacketDataKeys.MAX_PLAYERS];
          App.server.on('message', async data => {
            if(data[PacketDataKeys.TYPE] == PacketDataKeys.ROOM_IN_LOBBY_STATE) {
              const oid = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID];
              const numPl = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.PLAYERS_IN_ROOM];
              if(objectId == oid){
                loading.changeText(`Кол-во игроков в комнате: ${numPl}`);
                if(maxPl - numPl == 1){
                  await wait(50);
                  loading.done();
                  join();
                }
              }
            } else if(data[PacketDataKeys.TYPE] == PacketDataKeys.GAME_STATUS_IN_ROOMS_LIST){
              const oid = data[PacketDataKeys.ROOM_IN_LOBBY_STATE][PacketDataKeys.ROOM_OBJECT_ID];
              if(objectId == oid){
                const status = data[PacketDataKeys.STATUS];
                if(status == 2){
                  loading.done();
                  MessageBox(`Игра началась`);
                }
              }
            }
          }).key('waitingRils');
          loading.box.on('destroy', () => App.server.removeByKey('waitingRils'));
        })
        .case('Посмотреть', () => join())
        .case('Зайти', () => join())
        .case('Удалить', async () => {
          if(!isHistory) return;
          if(!(await ConfirmBox(`Вы уверены что хотите удалить?`))) return;
          if(!(await fs.existsFile(`${App.config.path}/history.json`)))
            await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify({ rooms: [] }));
          const history = JSON.parse(await fs.readFile(`${App.config.path}/history.json`));

          history.rooms.splice(Number(objectId), 1);

          await fs.writeFile(`${App.config.path}/history.json`, JSON.stringify(history));
          App.screen = new History();
        })
        .case(`Скопировать object id`, () => {

        });
    };
    getTexture(`rank/rank${rank}_36.png`).then(e => levelImg.src = e);
    title.textContent = `${room[PacketDataKeys.PASSWORD] ? '🔒 ' : ''}` + room[PacketDataKeys.TITLE];// + ` (${room[PacketDataKeys.MIN_LEVEL]})`;
    status.textContent = isHistory ? formatDate(room['created']) : room[PacketDataKeys.STATUS] == 0 ? `Регистрация` : `Игра началась`;
    status.style.color = isHistory ? 'black' : room[PacketDataKeys.STATUS] == 0 ? `green` : `red`
    title.prepend(levelImg);
    title.appendChild(status);
    div.appendChild(title);
    const arr = selectedRoles.slice().sort((a: number, b: number) => this.orderRoles.indexOf(a) - this.orderRoles.indexOf(b));
    for(const role of arr){
      const img = document.createElement('img');
      getRoleImg(role).then(e => img.src = e);
      img.width = 25;
      img.height = 35;
      img.style.margin = '1px';
      img.onmousedown = e => e.preventDefault();
      div.appendChild(img);
    }
    if(friends > 0) {
      const img = createElement('img', { width: 20, height: 20, css: { verticalAlign: 'text-bottom' } });
      getTexture(`ui/4v.png`).then(e => img.src = e);
      btnPlayers.appendChild(img);
    }
    createElement('span', { css: { marginLeft: '2px' }, text: typeof room[PacketDataKeys.MIN_PLAYERS] == 'number' ? `Игроки: ${room[PacketDataKeys.PLAYERS_NUM]} [${room[PacketDataKeys.MIN_PLAYERS]}/${room[PacketDataKeys.MAX_PLAYERS]}] ⭣` : `Игроки: [${room[PacketDataKeys.PLAYERS_NUM]}]`, appendTo: btnPlayers });
    btnPlayers.onclick = () => clickType = 'btnPlayers';
    div.appendChild(btnPlayers);

    return {
      elem: div,
      onJoin: (c) => joinCallback = c,
      onViewRoomPlayers: (c) => viewRoomPlayersCallback = c,
    };
  }

  addRoom(room: any){
    const self = this;
    const objectId = room[PacketDataKeys.OBJECT_ID];
    if(!this.filter(room)) {
      if(this.getRoomByObjectId(objectId)) this.rooms.splice(this.getRoomIdByObjectId(objectId), 1);
      this.rooms.push(Object.assign({}, {
        room,
        id: this.roomsId,
        rils(){},
        remove(){}
      }));
      return;
    }
    const roomElem = Rooms.getRoomElement(room);
    this.div.appendChild(roomElem.elem);

    // if(this.rooms[room[PacketDataKeys.OBJECT_ID]]) delete this.rooms[room[PacketDataKeys.OBJECT_ID]];
    // this.rooms[room[PacketDataKeys.OBJECT_ID]] = Object.assign({}, {

    if(this.getRoomByObjectId(objectId)) this.rooms.splice(this.getRoomIdByObjectId(objectId), 1);
    this.rooms.push(Object.assign({}, {
      room,
      id: this.roomsId,
      rils(data: any){
        const playersInRoom = data[PacketDataKeys.PLAYERS_IN_ROOM];
        const min = room[PacketDataKeys.MIN_PLAYERS];
        const max = room[PacketDataKeys.MAX_PLAYERS];
      },
      remove(){
        // if(self.rooms[this.room[PacketDataKeys.OBJECT_ID]].id != this.id) return;
        self.div.removeChild(roomElem.elem);
      }
    }));
    this.roomsId++;
  }
}
