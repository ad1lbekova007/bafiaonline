import Window from './Window';
import { readImage } from '../../core/src/image'
import fs from '../../core/src/fs/fs';
import config, { Config } from '../../core/src/config';
import { Version, Profile } from './enums'
import { uriServer } from '../../core/src/Constants';
import { createScript, noXSS, wait } from '../../core/src/utils/utils'
import PacketDataKeys from '../../core/src/PacketDataKeys'
import MD5 from '../../core/src/utils/md5'
import { isMobile } from '../../core/src/utils/mobile';
import App from './App';
import { createElement } from '../../core/src/utils/DOM';
import Dock from './Dock';

function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16));
}
function tokenHex(nBytes: number): string {
  const bytes = new Uint8Array(nBytes);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
}

const loadImage = (url: string) =>
  new Promise<string>((resolve) => {
    const img = new Image();
    let finished = false;

    img.onload = () => {
      if(finished) return;
      finished = true;
      resolve(url);
    };

    img.onerror = async () => {
      if(finished) return;
      finished = true;
      resolve(null as any);
    };

    img.src = url;

    setTimeout(() => {
      if(!finished) {
        finished = true;
        resolve(null as any);
      }
    }, 10000);
  });

export default class Launcher {
  win!: Window

  isDevMode = false;

  openedWindows: Window[] = [];

  options = {
    version: '',
    profile: '',
    windowsInFS: false,
    hideDock: false,
    devMode: false,
    theme: 'macos'
  }
  versions: Version[] = [];
  profiles: Profile[] = [];
  selectedVersion: Version | null = null;
  selectedProfile: Profile | null = null;

  statusText!: HTMLDivElement
  progressBar!: HTMLProgressElement
  listVersions!: HTMLSelectElement
  listProfiles!: HTMLDivElement
  playBtn!: HTMLButtonElement
  updateBtn!: HTMLButtonElement
  settingsBtn!: HTMLButtonElement

  constructor(){
    this.#init();
  }

  async readVersion(src: string): Promise<Version|null> {
    try {
      await createScript({ src });
      const version: Version = (window as any)['version'];
      delete (window as any)['version'];
      return version;
    } catch {
      try{
        const t = await(await fetch(src)).text();
        window['eval'](t);
        const version: Version = (window as any)['version'];
        delete (window as any)['version'];
        return version;
      }catch{
        return null;
      }
    }
    return null;
  }

  async #init(){
    await this.readData();

    if(!isMobile() && !this.options.hideDock && !this.options.windowsInFS)
      App.dock = new Dock();
    
    this.win = new Window({
      title: `Лаунчер (${App.version})`,
      icon: `🚀`,
      closeButton: false,
      // width: 700,
      width: 400,
      height: 300,
      center: true,
      fillScreen: this.options.windowsInFS
    });

    this.#initContent();

    if(this.versions.length == 0){
      this.win.lock();
      this.statusText.textContent = `Скачивание версии..`;
      console.log(`Downloading default version [vanilla]..`);
      try{
        const src = `https://raw.githubusercontent.com/lumik0/bafiaonline/refs/heads/master/run/images/vanilla.js?v=${Math.random()}`;
        const version = await this.readVersion(src);
        if(version) {
          await this.downloadVersion({ ...version, scriptPath: src });
          this.options.version = version.name;
        } else {
          alert(`Не удалось скачать версию по умолчанию.\nКод ошибки: 1\nОбратитесь в техподдержку`);
        }
      }catch(e){
        console.error(e);
        alert(`Не удалось скачать версию по умолчанию.\nКод ошибки: 0\nОбратитесь в техподдержку`);
      }
      this.win.unlock();
    }
  }

  async writeData(){
    await fs.writeFile(`/versions.json`, JSON.stringify(this.versions));
    await fs.writeFile(`/profiles.json`, JSON.stringify(this.profiles));
    await fs.writeFile(`/options.json`, JSON.stringify(this.options));
  }
  async readData(){
    if(!(await fs.existsFile('/urlsVersions.json'))) fs.writeFile(`/urlsVersions.json`, JSON.stringify(['./images/vanilla.js', './vanilla.js']));
    if(!(await fs.existsFile('/versions.json'))) fs.writeFile(`/versions.json`, '[]');
    if(!(await fs.existsFile('/profiles.json'))) fs.writeFile(`/profiles.json`, '[]');
    if(!(await fs.existsFile('/options.json'))) fs.writeFile(`/options.json`, JSON.stringify({
      version: '',
      profile: '',
      windowsInFS: false,
      theme: 'macos'
    }));
    this.versions = JSON.parse(await fs.readFile(`/versions.json`));
    this.profiles = JSON.parse(await fs.readFile(`/profiles.json`));
    this.options = JSON.parse(await fs.readFile(`/options.json`));
  }

  async #initContent(checkVersions = true) {
    const self = this
    const updateVersions: Version[] = [];
    this.win.content.innerHTML = '';

    const div = document.createElement('div');
    div.style.padding = '5px';
    this.win.content.appendChild(div);

    this.statusText = document.createElement('div');
    this.statusText.style.margin = '5px 5px 0 5px';
    div.appendChild(this.statusText);

    this.progressBar = document.createElement('progress');
    this.progressBar.value = 0
    this.progressBar.style.width = '100%'
    div.appendChild(this.progressBar);

    {
      const tabs = createElement('div', {
        css: {
          background: '#0f0e0e',
          borderRadius: '5px',
          width: '100%'
        }
      });
      div.appendChild(tabs);

      const btns = createElement('div', {
        css: {
          display: this.options.devMode ? 'flex' : 'none',
          justifyContent: 'center',
          width: '100%'
        }
      });
      tabs.appendChild(btns);

      const contents = createElement('div', {
        css: {
          width: '10%%'
        }
      });
      tabs.appendChild(contents);

      let size = 0, maxSize = 2;
      function addTab(name: string, content: HTMLElement, defaultSelected = false) {
        const btn = createElement('button', {
          text: name,
          css: {
            // borderRadius: size == 0 ? '5px 0 0 0' : size == maxSize-1 ? '0 5px 0 0' : '0'
            borderRadius: size == 0 ? '5px 0 0 5px' : size == maxSize-1 ? '0 5px 5px 0' : '0',
            margin: '1px'
          }
        });
        btn.onclick = () => {
          Array.from(contents.children).forEach(e => (e as HTMLElement).style.display = 'none');
          Array.from(btns.children).forEach(e => (e as HTMLElement).style.background = 'linear-gradient(to bottom, var(--tw-gradient-stops))');
          content.style.display = 'block';
          btn.style.background = '#bababa';
        }

        if(!defaultSelected) content.style.display = 'none';
        else btn.style.background = '#bababa';

        btns.appendChild(btn);
        contents.appendChild(content);
        size++;
      }

      addTab('Профили', createElement('div', {}, elem => {
        const p1 = createElement('p', {
          text: 'Выберите профиль',
          css: {
            margin: '5px'
          }
        });
        elem.appendChild(p1);

        this.listProfiles = createElement(`div`, {
          css: {
            width: '100%',
            height: '75px',
            background: '#171515',
            padding: '10px 0',
            borderRadius: '5px',
            display: 'flex',
            color: 'black'
          }
        });
        this.listProfiles.style.width = '100%';
        function update() {
          const selected = 'linear-gradient(232deg, #6bd393, #188341)'
          const notSelected = '#f3e3e3'
          const elems: HTMLDivElement[] = [];
          self.listProfiles.innerHTML = '';
          for(const pr of self.profiles){
            const el = createElement('div', {
              css: {
                width: '50px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '2px',
                padding: '5px',
                borderRadius: '5px',
                background: pr.userId == self.selectedProfile?.userId ? selected : notSelected
              }
            });
            const avatar = createElement('img', {
              width: 40,
              height: 40,
              css: {
                borderRadius: '100%'
              }
            });
            loadImage(`https://dottap.com/mafia/profile_photo/${pr.photo}?v=${Math.random()}`).then(e => avatar.src = e);
            const nick = createElement('span', {
              text: pr.name || pr.email,
              css: {
                fontSize: '12px'
              }
            });
            el.onclick = () => {
              self.selectedProfile = pr;
              elems.forEach(e => e.style.background = notSelected);
              el.style.background = selected;
            }
            el.appendChild(avatar);
            el.appendChild(nick);
            self.listProfiles.appendChild(el);
            elems.push(el);
          }

          const add = createElement('div', {
            css: {
              width: '50px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              margin: '2px',
              padding: '5px',
              borderRadius: '5px',
              background: notSelected
            }
          });
          add.onclick = () => self.addProfile();
          const plus = createElement('span', {
            html: '+',
            css: {
              fontSize: '32px'
            }
          });
          const addText = createElement('span', {
            html: 'Новый',
            css: {
              fontSize: '12px'
            }
          });
          add.appendChild(plus);
          add.appendChild(addText);
          self.listProfiles.appendChild(add);
          
          const remove = createElement('div', {
            css: {
              width: '50px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              margin: '2px',
              padding: '5px',
              borderRadius: '5px',
              background: notSelected
            }
          });
          remove.onclick = async () => {
            const p = self.profiles.findIndex(e => e.userId == self.selectedProfile?.userId || self.selectedProfile?.email == e.email);
            if(p != -1) {
              const profile = self.profiles[p];
              if(!confirm('Вы уверены что хотите удалить профиль "'+(profile.name || profile.email)+'"?')) return;
              self.win.lock();
              self.profiles.splice(p, 1);
              await self.writeData();
              self.statusText.innerHTML = `Профиль ${profile.name || profile.email} удален`;
              self.win.unlock();
              update();
            } else {
              alert('Для начала выберите профиль который хотите удалить');
            }
          }
          const minus = createElement('span', {
            html: '-',
            css: {
              fontSize: '32px'
            }
          });
          const removeText = createElement('span', {
            html: 'Удалить',
            css: {
              fontSize: '12px'
            }
          });
          remove.appendChild(minus);
          remove.appendChild(removeText);
          self.listProfiles.appendChild(remove);
        }
        const p = self.profiles.find(e => e.userId == self.options.profile);
        if(p) self.selectedProfile = p;
        update()
        elem.appendChild(this.listProfiles);
      }), true);
      addTab('Версии', createElement('div', {}, elem => {
        this.listVersions = document.createElement(`select`);
        this.listVersions.size = 4
        this.listVersions.style.width = '100%';
        function update() {
          self.listVersions.innerHTML = '';
          for(const ver of self.versions){
            const el = document.createElement('option');
            el.innerHTML = ver.name;
            if(ver.scriptPath && checkVersions) updateVersions.push(ver);
            self.listVersions.appendChild(el);
          }
          if(!self.options.version) {
            self.options.version = self.versions[0].name;
            self.writeData();
          }
          self.listVersions.value = self.options.version;
        }
        update()
        elem.appendChild(self.listVersions);

        const addVersionBtn = createElement('button', {
          text: '+',
          css: {
            width: '20px',
            height: '20px',
            borderRadius: '5px 0 0 5px',
            fontFamily: 'monospace',
            padding: '0'
          }
        });
        addVersionBtn.onclick = () => this.addVersion();
        elem.appendChild(addVersionBtn);
        const removeVersionBtn = createElement('button', {
          text: '-',
          css: {
            width: '20px',
            height: '20px',
            borderRadius: '0 5px 5px 0',
            fontFamily: 'monospace',
            padding: '0'
          }
        });
        removeVersionBtn.onclick = async() => {
          const p = this.versions.findIndex(e => e.name == this.listVersions.value);
          if(p != -1) {
            this.win.lock()
            const version = this.versions[p];
            this.versions.splice(p, 1);
            await fs.deleteDirectory(version.path, true);
            await this.writeData();
            this.statusText.innerHTML = `Версия ${version.name} удалена`;
            this.win.unlock();
            update()
          }
        }
        elem.appendChild(removeVersionBtn);
      }));
    }

    const btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.margin = '5px';
    btns.style.justifyContent = 'center';
    div.appendChild(btns);
    this.playBtn = createElement('button', {
      text: 'Играть',
      css: {
        margin: '1px',
        width: '100%',
        padding: '10px',
        background: '#b3f8b3',
        borderRadius: '7px'
      }
    });
    this.playBtn.onclick = async() => {
      const v = this.versions.find(e => e.name == this.listVersions.value);
      const p = this.profiles.find(e => e.userId == this.selectedProfile?.userId);
      if(v) {
        // console.log(p);
        this.runGame(v, p);
      } else {
        alert(`Не найдена версия\n\nОбратитесь в техподдержку`);
      }
    };
    btns.appendChild(this.playBtn);

    this.updateBtn = createElement('button', {
      text: 'Обновить',
      css: {
        margin: '1px',
        borderRadius: '7px'
      }
    });
    this.updateBtn.onclick = async () => {
      let updated = false;
      this.win.lock();
      for await(const ver of updateVersions){
        this.statusText.textContent = 'Проверка..';

        const version = await this.readVersion(ver.scriptPath!);
        if(version && ver.sha1 != version.sha1) {
          await this.downloadVersion({ ...version, ...ver });
          updated = true;
        }
      }
      if(!updated){
        this.statusText.textContent = '';
        this.win.unlock();
      }

      if(this.isDevMode) {
        const v = this.versions.find(e => e.name == this.options.version);
        const p = this.profiles.find(e => e.userId == this.options.profile);
        if(v){
          this.runGame(v, p);
        }
        return;
      }
    }
    btns.appendChild(this.updateBtn);

    this.settingsBtn = createElement('button', {
      text: 'Настройки',
      css: {
        margin: '1px',
        borderRadius: '7px'
      }
    });
    this.settingsBtn.onclick = async () => {
      this.openSettings();
    }
    btns.appendChild(this.settingsBtn);

    const info = document.createElement('div');
    info.style.fontSize = '12px'
    info.innerHTML = ``.replaceAll('\n', '<br/>');
    fetch('https://raw.githubusercontent.com/lumik0/bafiaonline/refs/heads/master/core/news.txt').then(r => r.status == 200 ? r.text() : null).then(t => info.innerHTML = t ? t.replaceAll('\n', '<br/>') : '');
    div.appendChild(info);

    const extra = document.createElement('div');
    extra.style.fontSize = '12px'
    extra.innerHTML = `\nИдеи/Баги/Проблемы? <a href="https://t.me/bafiaonlinebot">@bafiaonlinebot</a>
Github: <a href="https://github.com/lumik0/bafiaonline">Github</a>
Telegram канал: <a href="https://t.me/bafiaonline"></a>`.replaceAll('\n', '<br/>');
    div.appendChild(extra);

    this.updateBtn.click();
  }

  openSettings() {
    this.win.lock();

    const width = isMobile() ? window.innerWidth-150 : 300
    const win = new Window({
      title: 'Настройки',
      icon: '🛠',
      width,
      height: 220,
      resizable: false,
      moveable: false,
      noMobile: true,
      minButton: false,
      maxButton: false,
      x: this.win.x + (this.win.width - width) / 2,
      y: this.win.y + (this.win.height - 200) / 2,
    });
    win.content.style.overflow = 'hidden';
    win.on('close', () => {
      this.win.unlock();
    });

    const div = document.createElement('div');
    div.style.padding = '2px';
    win.content.appendChild(div);

    const e = document.createElement('div');
    e.style.display = 'flex';
    e.style.padding = '5px';
    e.style.flexDirection = 'column';
    div.appendChild(e);

    function addCheckbox(text: string, onChange: (v: boolean) => void, value = false){
      const d = createElement('div', {
        css: {
          borderRadius: '10px',
          background: '#212020',
          height: '30px',
          margin: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }
      });

      e.appendChild(d);
      const t = createElement('span', {
        css: {
          marginLeft: '10px',
          fontSize: 'smaller'
        },
        text
      });
      d.appendChild(t);
      const cb = createElement('input', {
        type: 'checkbox',
        checked: value,
        css: {
          zoom: '1.5'
        }
      });
      cb.onchange = () => onChange(cb.checked);
      d.appendChild(cb);
    }
    function addButton(text: string, btnText: string, onClick: () => void){
      const d = createElement('div', {
        css: {
          borderRadius: '10px',
          background: '#212020',
          height: '30px',
          margin: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }
      });

      e.appendChild(d);
      const t = createElement('span', {
        css: {
          marginLeft: '10px',
          fontSize: 'smaller'
        },
        text
      });
      d.appendChild(t);
      const btn = createElement('button', {
        text: btnText,
      });
      btn.onclick = () => onClick();
      d.appendChild(btn);
    }

    addButton('Очистить все данные', 'Очистить', async() => {
      const e = confirm('Вы уверены? Восстановить будет невозможно');
      if(e) {
        try {
          await fs.erase();
          window.location.reload();
        } catch(e) {
          alert(`Ошибка: ${e}`);
        }
      }
    });
    if(!isMobile()) {
      addCheckbox('Открывать окна в полноэкранном режиме', async v => {
        this.options.windowsInFS = v;
        await this.writeData();
        location.reload();
      }, this.options.windowsInFS);
      if(!this.options.windowsInFS){
        addCheckbox('Скрывать Dock', async v => {
          this.options.hideDock = v;
          await this.writeData();
          if(v){
            App.dock?.win.close();
            App.dock = undefined;
          } else {
            App.dock = new Dock();
          }
        }, this.options.hideDock);
      }
    }
    addCheckbox('Режим разработчиков', async v => {
      this.options.devMode = v;
      await this.writeData();
      location.reload();
    }, this.options.devMode);
  }

  addProfile() {
    {
      const v = this.versions.find(e => e.name == this.listVersions.value);
      if(v) {
        this.runGame(v);
      } else {
        alert(`Не найдена версия\n\nДля создания профиля нужна версия`);
      }
      return;
    }
  }

  async addVersion(version?: Version){
    const self = this;
    if(version){
      if(!(await fs.existsFile(`${version.path}/config.json`))){
        const conf = config();
        conf.path = version.path;
        await fs.writeFile(`${version.path}/config.json`, JSON.stringify(conf));
      }
      if(!version.uuid) version.uuid = uuidv4();
      const i = this.versions.findIndex(e => e.path == version.path)
      if(i != -1) {
        this.versions[i] = version;
      } else {
        this.versions.push(version);
      }
      await this.writeData();
      if(i == -1) await this.#initContent(false);
      return;
    }
    this.win.lock();
    const width = isMobile() ? window.innerWidth-150 : 300
    const win = new Window({
      title: 'Добавление версии',
      icon: '➕',
      width,
      height: 200,
      resizable: false,
      moveable: false,
      noMobile: true,
      minButton: false,
      maxButton: false,
      x: this.win.x + (this.win.width - width) / 2,
      y: this.win.y + (this.win.height - 200) / 2,
    });
    win.content.style.overflow = 'hidden'
    win.on('close', () => {
      this.win.unlock();
    });

    const loadFileBtn = document.createElement('button');
    loadFileBtn.style.width = '100%'
    loadFileBtn.innerHTML = 'Загрузить файл';
    loadFileBtn.onclick = () => this.downloadFileVersion();
    win.content.appendChild(loadFileBtn);

    const div = document.createElement('div');
    div.style.display = 'flex';
    const inputPathScript = document.createElement('input');
    inputPathScript.placeholder = `Путь к скрипту`;
    div.appendChild(inputPathScript);
    const loadScriptBtn = document.createElement('button');
    loadScriptBtn.style.width = '100%'
    loadScriptBtn.innerHTML = 'Загрузить скрипт';
    loadScriptBtn.onclick = async() => {
      const src = inputPathScript.value;
      try{
        const version = await this.readVersion(src);
        if(version){
          win.close();
          await self.downloadVersion({...version, scriptPath: src});
        } else {
          alert(`Ошибка: ${e}`);
        }
      } catch(e) {
        alert(`Ошибка: ${e}`);
      }
    }
    div.appendChild(loadScriptBtn);
    win.content.appendChild(div);

    const foundScripts = document.createElement('div');
    foundScripts.style.display = 'flex';
    foundScripts.style.flexDirection = 'column';
    const e = document.createElement('p');
    e.style.margin = '5px'
    e.textContent = `Найдены версии:`;
    foundScripts.appendChild(e);
    const urls = JSON.parse(await fs.readFile(`/urlsVersions.json`));
    let found = false;
    for await(const url of urls){
      try{
        const version = await this.readVersion(url);
        if(version){
          const e = document.createElement('button');
          e.textContent = noXSS(url);
          e.onclick = async () => {
            win.close();
            await self.downloadVersion({...version, scriptPath: url});
          }
          foundScripts.appendChild(e);
          found = true;
        }
      } catch{}
    }
    if(found) win.content.appendChild(foundScripts);
  }
  async downloadVersion(version: Version){
    const self = this;
    const dirName = version.name.replaceAll(`/`,`_`);
    if(!version.path) version.path = `/versions/${dirName}`;
    let size = 0, total = 0, updated = false;
    this.win.lock();
    await readImage('image', `${version.path}/`, false, {
      startProcessFS(s) {
        size = s;
        self.progressBar.max = s;
      },
      processFS(path, write) {
        total++
        self.progressBar.value = total
        if(write) {
          self.statusText.textContent = `Скачан файл (${Math.floor((total / size) * 100)}%)`;
          console.log(`downloading..`, path);
          updated = true;
        } else
          self.statusText.textContent = `Проверка (${Math.floor((total / size) * 100)}%)`;
      },
    });
    self.statusText.textContent = updated ? `Обновлено` : '';
    self.addVersion(version);
    await new Promise(res => setTimeout(res, 100));
    this.win.unlock();
  }

  downloadFileVersion(){
    const self = this;
    const input = document.createElement('input');
    input.type = 'file';

    return new Promise<boolean>((res, rej) => {
      input.onchange = e => {
        if(!e.target) return;
        // @ts-ignore
        const file = e.target.files[0];

        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');
        // reader.readAsArrayBuffer(file);

        reader.onload = async readerEvent => {
          // @ts-ignore
          const content = readerEvent.target.result;
          // @ts-ignore
          window['eval'](content);
          // @ts-ignore
          const version = window['version'];
          // @ts-ignore
          delete window['version'];
          await self.downloadVersion(version);
          res(true);
        }
        reader.onerror = () => res(false);
      }

      input.click();
    });
  }

  async runGame(version: Version, profile?: Profile) {
    this.win?.lock();
    const config = JSON.parse(await fs.readFile(`${version.path}/config.json`)) as Config;
    const mainScript = await fs.readFile(`${version.path}/main.js`);

    window['eval'](mainScript);

    // @ts-ignore
    if(!window['main']){
      console.error(`No main function`);
      return;
    }

    if(profile){
      config.auth = {
        email: profile.email,
        password: profile.password
        // token: profile.token,
        // userId: profile.userId
      }
    }
    if(this.options.version != version.name || this.options.profile != profile?.userId){
      this.options.version = version.name;
      this.options.profile = profile ? profile.userId! : '';
      this.writeData();
    }

    const win = new Window({
      title: `${version.name}`,
      icon: '🎮',
      width: 400,
      height: 500,
      minWidth: 250,
      minHeight: 400,
      center: true,
      fillScreen: this.options.windowsInFS,
      zoom: .7
    });

    // @ts-ignore
    window['main'](config, win, win.content);

    this.openedWindows.push(win);

    this.win?.unlock();
    
    await win.wait('close');
    if(this.win) this.#initContent();
  }
}
