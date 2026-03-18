import App from "../App";
import Screen from "./Screen";
import { wrap } from "../../../core/src/utils/TypeScript";
import fs from "../../../core/src/fs/fs";
import { getBackgroundImg, getImage, getTexture } from "../utils/Resources";
import { createElement } from "../../../core/src/utils/DOM";
import Dashboard from "./Dashboard";
import PacketDataKeys from "../../../core/src/PacketDataKeys";
import MessageBox from "../dialog/MessageBox";

export default class Matchmaking extends Screen {
  online = 0;

  el!: HTMLDivElement

  constructor(){
    super('Matchmaking');

    App.title = 'Соревновательный';

    (async() => this.element.style.background = `url(${await getBackgroundImg('menu3')}) 0% 0% / cover`)();

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
    const titleElem = document.createElement('label');
    titleElem.textContent = 'Соревновательный';
    header.appendChild(titleElem);

    this.on('back', () => {
      App.screen = new Dashboard();
    });

    this.init();
  }

  async init(){
    App.server.send("mmgsk", {
      [PacketDataKeys.USER_OBJECT_ID]: App.user.objectId,
      [PacketDataKeys.TOKEN]: App.user.token
    });

    App.server.send('mmguiabk', { mmbpa: 12 });
    const data = await App.server.awaitPacket('mmuiabk');
    this.online = data.mmuiabk;
    this.search();
  }

  async search(){
    this.el = createElement('div', {
      css: {
        display: 'flex',
        flexDirection: 'column',
        padding: '20px'
      },
      appendTo: this.element
    });
    const online = createElement('div', {
      text: 'Сейчас играют: ' + this.online,
      css: {
        margin: '5px'
      },
      appendTo: this.el
    })
    const btn = createElement('button', { text: 'Начать поиск', appendTo: this.el });
    btn.onclick = async() => {
      // App.server.send('mmauk', { mmbpa: 12 });
      const video = createElement('img', {
        src: '../game/meme.gif',
        width: 275,
        height: 150
      });
      MessageBox(`Скоро... (сегодня)

        `, {
        element: video,
        height: 325
      });
    }
  }
}

//
// mmauk - начать играть
// mmguiabk - отмена
// mmagu - сколько приняли, mmagua - колво
// mmfun - сколько людей в поиске
//