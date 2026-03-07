import fs from '../../core/src/fs/fs';
import { createElement } from '../../core/src/utils/DOM';
import App from './App';
import Launcher from './Launcher';
import Window from './Window';

async function main(){
  await fs.init('Indexeddb');
  App.launcher = new Launcher();

  const captcha = new Window({
    title: 'капча',
    width: 325,
    height: 125,
    center: true
  });
  `<div class="g-recaptcha" data-sitekey="6LeppQksAAAAAI9be-f3gQPNKDIOKeQdyEAE-zle"></div>`;
  // const div = createElement('div', {
  //   className: 'g-recaptcha',
  //   attr: [
  //     ['data-sitekey', '6LeppQksAAAAAI9be-f3gQPNKDIOKeQdyEAE-zle']
  //   ]
  // });
  const div = document.getElementById('captcha');
  const span = createElement('span', { text: 'можно закрыть, это для теста' });
  captcha.content.appendChild(div!);
  captcha.content.appendChild(span);
}

(async function(){
  await(new Promise<void>(async(res)=>{
    await document.fonts.ready;
    const iid = setInterval(()=>{
      if(document.body && document.readyState == "interactive" || document.readyState == "complete"){
        clearInterval(iid);
        res();
      }
    }, 10);
  }));
})().then(main);
