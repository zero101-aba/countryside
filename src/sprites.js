// 像素小人精灵绘制：全部程序化，无外部素材
// 采用 1 像素 = 1 逻辑像素的整数矩形，保证像素风干净利落。

const EMO = {
  idle: '💭', happy: '😊', tired: '😪', hungry: '🍞', angry: '💢',
  chat: '💬', love: '💗', think: '💭', sad: '😔', work: '💪', sleep: '💤',
};

export class SpriteBank {
  constructor() {
    this.cache = new Map();
  }

  makeChar(v) {
    const c = document.createElement('canvas');
    c.width = 22; c.height = 22;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    this._drawChar(x, v, 0, 'down', 'idle', 0);
    return c;
  }

  // 方向 + 动作 + 相位 + 眨眼
  key(v, dir, action, phase, blink) { return `${v.id}:${v.appearanceKey || 'default'}|${dir}|${action}|${phase}|${blink ? 1 : 0}`; }

  get(v, dir, action, phase, blink = false) {
    const k = this.key(v, dir, action, phase, blink);
    let cv = this.cache.get(k);
    if (!cv) {
      cv = document.createElement('canvas');
      cv.width = 22; cv.height = 22;
      const x = cv.getContext('2d');
      x.imageSmoothingEnabled = false;
      this._drawChar(x, v, phase, dir, action, phase, blink);
      this.cache.set(k, cv);
    }
    return cv;
  }

  _drawChar(c, v, frame, dir, action, phase, blink = false) {
    const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    const back = dir === 'up';
    const side = dir === 'left' || dir === 'right';
    const face = back ? v.hair : v.skin;

    // 影子（在脚下）
    c.globalAlpha = 0.22; R(4, 19, 14, 3, '#1e1a16'); c.globalAlpha = 1;

    const bobY = frame === 1 ? 1 : 0;
    const legSwing = frame === 1 ? 1 : 0;

    // 腿
    const legY = 16;
    R(7, legY, 3, 4 - legSwing, v.pants);
    R(12, legY, 3, 4 - (1 - legSwing), v.pants);
    R(6, 19, 4, 2, v.boots || '#3a2c22');
    R(11, 19, 4, 2, v.boots || '#3a2c22');
    if (v.boots) { R(6, 18, 4, 1, this._shade(v.boots, -0.2)); R(11, 18, 4, 1, this._shade(v.boots, -0.2)); }

    // 身体
    R(6, 9 + bobY, 10, 7, v.shirt);
    R(6, 14 + bobY, 10, 2, this._shade(v.shirt, -0.18));
    // 马甲 / 外套：两侧盖住，中间露衬衫
    if (v.vest) {
      const vc = v.vestColor || this._shade(v.shirt, -0.16);
      R(6, 9 + bobY, 3, 6, vc);
      R(13, 9 + bobY, 3, 6, vc);
      R(6, 9 + bobY, 10, 1, vc);
      R(9, 10 + bobY, 4, 1, this._shade(v.shirt, 0.1));
      R(7, 9 + bobY, 1, 2, this._shade(vc, 0.18));
    }
    if (v.belt) R(6, 14 + bobY, 10, 1, v.belt);
    if (v.apron) {
      R(8, 12 + bobY, 6, 5, '#efe6d2');
      R(8, 9 + bobY, 1, 4, '#efe6d2');
      R(13, 9 + bobY, 1, 4, '#efe6d2');
    }
    // 连帽卫衣：兜帽领口、肩部、抽绳、胸前图案
    if (v.hood) {
      const hc = v.hoodColor || this._shade(v.shirt, 0.14);
      R(4, 9 + bobY, 3, 5, hc);
      R(15, 9 + bobY, 3, 5, hc);
      R(6, 8 + bobY, 10, 2, hc);
      R(6, 9 + bobY, 2, 4, this._shade(hc, -0.12));
      R(14, 9 + bobY, 2, 4, this._shade(hc, -0.12));
      if (v.logo) {
        // 胸前一小行浅色字母，像卫衣上的印花
        R(7, 12 + bobY, 4, 1, this._shade(v.logo, -0.18));
      }
    } else if (v.logo) {
      // 白T恤上的黑色小印花
      R(8, 12 + bobY, 5, 1, v.logo);
      R(9, 13 + bobY, 3, 1, v.logo);
    }
    // 手臂
    const armCol = v.shirt;
    if (side) {
      const front = dir === 'right';
      R(front ? 15 : 5, 10 + bobY, 2, 5, armCol);
      R(front ? 14 : 6, 10 + bobY, 2, 5, this._shade(armCol, -0.1));
    } else {
      R(4, 10 + bobY, 2, 5, armCol);
      R(16, 10 + bobY, 2, 5, armCol);
    }
    R(4, 15 + bobY, 2, 2, v.skin);
    R(16, 15 + bobY, 2, 2, v.skin);
    // 斜挎包
    if (v.satchel) {
      const sc = v.satchelColor || '#8a5c35';
      R(7, 10 + bobY, 1, 1, sc);
      R(8, 11 + bobY, 1, 1, sc);
      R(9, 12 + bobY, 1, 1, sc);
      R(10, 13 + bobY, 1, 1, sc);
      R(11, 14 + bobY, 1, 1, sc);
      R(13, 15 + bobY, 5, 4, sc);
      R(13, 15 + bobY, 5, 1, this._shade(sc, 0.22));
      R(15, 16 + bobY, 1, 1, '#e8d8b0');
    }

    // 头
    R(6, 2 + bobY, 10, 8, face);
    // 发型：short / bob / long / ponytail / curly / bald / bun / spiky
    const style = v.hairStyle || (v.bun ? 'bun' : v.spikes ? 'spiky' : v.longHair ? 'long' : 'short');
    if (back) {
      R(5, 1 + bobY, 12, 9, v.hair);
      R(6, 9 + bobY, 10, 1, this._shade(v.hair, -0.12));
      if (style === 'long') R(4, 4 + bobY, 14, 10, v.hair);
      else if (style === 'bob') R(4, 6 + bobY, 14, 5, v.hair);
      else if (style === 'ponytail') {
        R(9, 5 + bobY, 4, 10, v.hair);
        R(10, 4 + bobY, 2, 1, v.tie || this._shade(v.hair, 0.3));
      } else if (style === 'bun') {
        R(9, 0 + bobY, 4, 2, v.hair);
      } else if (style === 'curly') {
        R(4, 3 + bobY, 2, 2, v.hair); R(16, 3 + bobY, 2, 2, v.hair);
        R(5, 8 + bobY, 2, 2, v.hair); R(15, 8 + bobY, 2, 2, v.hair);
      }
    } else {
      if (style !== 'bald') {
        R(5, 1 + bobY, 12, 3, v.hair);
        R(5, 1 + bobY, 2, 6, v.hair);
        R(15, 1 + bobY, 2, 6, v.hair);
        R(6, 1 + bobY, 3, 1, this._shade(v.hair, 0.16));
      } else {
        R(5, 3 + bobY, 1, 3, v.hair);
        R(16, 3 + bobY, 1, 3, v.hair);
      }
      if (side) {
        const front = dir === 'right';
        R(front ? 4 : 15, 3 + bobY, 3, 4, v.hair);
      }
      if (style === 'bob') {
        R(5, 5 + bobY, 2, 5, v.hair);
        R(15, 5 + bobY, 2, 5, v.hair);
        R(6, 9 + bobY, 10, 1, v.hair);
      } else if (style === 'long') {
        R(4, 3 + bobY, 1, 8, v.hair);
        R(17, 3 + bobY, 1, 8, v.hair);
        R(5, 9 + bobY, 1, 4, this._shade(v.hair, -0.1));
        R(16, 9 + bobY, 1, 4, this._shade(v.hair, -0.1));
      } else if (style === 'ponytail') {
        R(17, 4 + bobY, 2, 6, v.hair);
        R(17, 3 + bobY, 2, 1, v.tie || this._shade(v.hair, 0.3));
        if (v.hairpin) R(16, 4 + bobY, 2, 1, v.hairpin);
      } else if (style === 'curly') {
        R(4, 2 + bobY, 2, 2, v.hair);
        R(16, 2 + bobY, 2, 2, v.hair);
        R(4, 7 + bobY, 2, 3, v.hair);
        R(16, 7 + bobY, 2, 3, v.hair);
      }
      // 刘海
      if (v.bangs) {
        R(6, 3 + bobY, 10, 1, v.hair);
        R(7, 4 + bobY, 2, 1, v.hair);
        R(12, 4 + bobY, 2, 1, v.hair);
        R(9, 4 + bobY, 1, 1, this._shade(v.hair, 0.22));
        R(13, 4 + bobY, 1, 1, this._shade(v.hair, 0.18));
      }
      // 蓬松碎发
      if (style === 'spiky') {
        R(7, 0 + bobY, 2, 1, v.hair);
        R(10, 0 + bobY, 1, 1, v.hair);
        R(12, 0 + bobY, 2, 1, v.hair);
        R(6, 1 + bobY, 1, 1, v.hair);
        R(16, 1 + bobY, 1, 1, v.hair);
      }
    }
    // 丸子头
    if (style === 'bun') {
      R(9, 0 + bobY, 4, 2, v.hair);
      R(10, 0 + bobY, 1, 1, this._shade(v.hair, 0.12));
      if (v.hairpin) {
        R(8, 1 + bobY, 2, 1, v.hairpin);
        R(12, 0 + bobY, 1, 1, v.hairpin);
      }
    }
    // 胡子
    if (v.beard && !back) {
      const bc = v.beardColor || this._shade(v.hair, 0.1);
      if (v.beard === 'stubble') {
        c.globalAlpha = 0.38;
        R(6, 8 + bobY, 10, 2, bc);
        c.globalAlpha = 1;
      } else if (v.beard === 'full') {
        R(6, 7 + bobY, 10, 3, bc);
        R(7, 9 + bobY, 8, 2, bc);
        R(8, 8 + bobY, 6, 1, this._shade(bc, 0.15));
      } else if (v.beard === 'long') {
        R(6, 7 + bobY, 10, 3, bc);
        R(7, 10 + bobY, 8, 4, bc);
        R(9, 10 + bobY, 4, 5, this._shade(bc, 0.12));
      } else if (v.beard === 'goatee') {
        R(9, 9 + bobY, 4, 2, bc);
      }
    }
    // 眼睛（支持眨眼）
    if (!back) {
      if (blink) {
        if (side) {
          const ex = dir === 'right' ? 13 : 8;
          R(ex, 7 + bobY, 2, 1, '#2a2420');
        } else {
          R(8, 7 + bobY, 2, 1, '#2a2420');
          R(12, 7 + bobY, 2, 1, '#2a2420');
        }
      } else if (side) {
        const ex = dir === 'right' ? 13 : 8;
        R(ex, 6 + bobY, 2, 2, '#2a2420');
      } else {
        R(8, 6 + bobY, 2, 2, '#2a2420');
        R(12, 6 + bobY, 2, 2, '#2a2420');
        R(8, 6 + bobY, 1, 1, '#f8f0e0');
        R(12, 6 + bobY, 1, 1, '#f8f0e0');
      }
      // 眉毛
      if (v.eyebrows) {
        if (side) {
          const ex = dir === 'right' ? 13 : 8;
          R(ex, 5 + bobY, 2, 1, v.eyebrows);
        } else {
          R(8, 5 + bobY, 2, 1, v.eyebrows);
          R(12, 5 + bobY, 2, 1, v.eyebrows);
        }
      }
      // 唇色（小杨）
      if (v.lips) R(10, 9 + bobY, 2, 1, '#b04f4f');
      // 腮红
      c.globalAlpha = 0.35;
      R(7, 8 + bobY, 1, 1, '#d8685a');
      R(14, 8 + bobY, 1, 1, '#d8685a');
      c.globalAlpha = 1;
      // 眼镜
      if (v.accessory === 'glasses') {
        const gc = v.accessoryColor || '#3a3a3a';
        if (side) {
          const ex = dir === 'right' ? 13 : 8;
          R(ex - 1, 5 + bobY, 4, 1, gc);
          R(ex - 1, 8 + bobY, 4, 1, gc);
          R(ex - 1, 5 + bobY, 1, 4, gc);
          R(ex + 2, 5 + bobY, 1, 4, gc);
        } else {
          R(7, 5 + bobY, 5, 1, gc);
          R(7, 8 + bobY, 5, 1, gc);
          R(7, 5 + bobY, 1, 4, gc);
          R(11, 5 + bobY, 1, 4, gc);
          R(12, 5 + bobY, 5, 1, gc);
          R(12, 8 + bobY, 5, 1, gc);
          R(16, 5 + bobY, 1, 4, gc);
          R(12, 6 + bobY, 1, 1, gc);
        }
      }
      // 耳饰
      if (v.accessory === 'earring') {
        const ec = v.accessoryColor || '#e8c060';
        R(16, 7 + bobY, 1, 1, ec);
        R(16, 8 + bobY, 1, 1, this._shade(ec, 0.3));
      }
      // 围巾
      if (v.accessory === 'scarf') {
        const sc = v.accessoryColor || '#c25b4e';
        R(6, 9 + bobY, 10, 2, sc);
        R(7, 9 + bobY, 8, 1, this._shade(sc, 0.18));
        R(12, 11 + bobY, 3, 4, sc);
        R(13, 11 + bobY, 1, 3, this._shade(sc, -0.15));
      }
      // 项链（小杨）
      if (v.necklace) {
        R(10, 10 + bobY, 1, 1, v.necklace);
      }
    }

    // 帽子
    this._hat(c, v, dir, bobY, R);

    // ---- 动作附加 ----
    const p = phase % 4;
    if (action === 'hoe') {
      const ang = [0.9, 0.2, -0.6, 0.2][p];
      c.save();
      c.translate(dir === 'left' ? 6 : 16, 14 + bobY);
      c.rotate(dir === 'left' ? -ang : ang);
      R(0, -1, 9, 2, '#9a6b3f');
      R(9, -2, 3, 4, '#b8bcc0');
      c.restore();
    } else if (action === 'water') {
      R(15, 11 + bobY, 4, 3, '#5ab8e0');
      R(18, 12 + bobY, 3, 1, '#8fd8f0');
      R(15, 10 + bobY, 1, 2, '#3f8ab0');
      // 水滴
      if (p === 1 || p === 2) {
        c.fillStyle = '#8fd8f0';
        R(19, 16 + (p === 1 ? 0 : 2), 1, 2, '#8fd8f0');
      }
    } else if (action === 'seed') {
      R(14, 12 + bobY, 3, 3, '#8a5c35');
      R(14, 11 + bobY, 3, 1, '#a97a4a');
      if (p === 1) { R(19, 17, 1, 1, '#7cc35a'); }
    } else if (action === 'carry') {
      R(15, 6 + bobY, 4, 4, '#c98b52');
      R(15, 6 + bobY, 4, 1, '#e0b070');
      R(6, 10 + bobY, 10, 4, v.shirt);
    } else if (action === 'eat') {
      R(14, 10 + bobY, 3, 2, '#e8a05a');
      if (p === 2) R(14, 9 + bobY, 3, 1, '#c47a3a');
    } else if (action === 'axe') {
      const ang = [1.0, 0.3, -0.7, 0.3][p];
      c.save();
      c.translate(dir === 'left' ? 5 : 17, 13 + bobY);
      c.rotate(dir === 'left' ? -ang : ang);
      R(0, -1, 9, 2, '#7a5232');
      R(8, -4, 3, 8, '#c8ccd0');
      c.restore();
    } else if (action === 'fish') {
      R(15, 11 + bobY, 2, 2, '#7a5232');
      c.save();
      c.strokeStyle = '#d8cfc0'; c.lineWidth = 1;
      c.beginPath();
      c.moveTo(dir === 'left' ? 4 : 18, 12 + bobY);
      c.lineTo(dir === 'left' ? -8 : 30, 4 + bobY);
      c.stroke();
      c.restore();
    } else if (action === 'pick') {
      if (p % 2 === 0) R(14, 14 + bobY, 2, 3, v.skin);
    } else if (action === 'rest') {
      R(4, 12 + bobY, 3, 2, v.shirt);
    } else if (action === 'chat') {
      R(16, 8 + bobY, 2, 2, v.skin);
    }

    // 工具标记：干活的村民头顶小星星（由外部绘制）
  }

  _hat(c, v, dir, bobY, R) {
    const hc = v.hatColor;
    if (v.hat === 'straw') {
      R(3, 2 + bobY, 16, 2, hc);
      R(4, 1 + bobY, 14, 1, this._shade(hc, 0.1));
      R(7, -1 + bobY, 8, 3, this._shade(hc, -0.05));
      R(8, -2 + bobY, 6, 2, hc);
    } else if (v.hat === 'cap') {
      R(5, 0 + bobY, 12, 3, hc);
      if (dir !== 'up') {
        const front = dir === 'right';
        if (dir === 'left') R(2, 2 + bobY, 5, 2, this._shade(hc, -0.1));
        else if (dir === 'right') R(15, 2 + bobY, 5, 2, this._shade(hc, -0.1));
        else R(5, 2 + bobY, 12, 2, this._shade(hc, -0.1));
      }
    }
  }

  _shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (amt >= 0) {
      r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt;
    } else {
      r *= 1 + amt; g *= 1 + amt; b *= 1 + amt;
    }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  // 头像：用于 DOM 卡片
  avatar(v, size = 34) {
    const src = this.get(v, 'down', 'idle', 0);
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    // 裁头部（含帽子）：源图里 4,0 - 14x13
    x.drawImage(src, 4, 0, 14, 13, 0, 0, size, size);
    return c;
  }
}

export { EMO };









