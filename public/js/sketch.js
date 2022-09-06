/**
 * Sketch
 *
 * initially based upon resource found at:
 * https://github.com/akella/webGLImageTransitions
 *
 * Original lisence:
 * This resource can be used freely if integrated or build upon in personal or commercial projects such as websites,
 * web apps and web templates intended for sale. It is not allowed to take the resource "as-is" and sell it, redistribute,
 * re-publish it, or sell "pluginized" versions of it. Free plugins built using this resource should have a visible mention and
 * link to the original work. Always consider the licenses of all included libraries, scripts and images used.
 *
 * ! notice: heavily modified for infoscreen3 use !
 */
class Sketch {
  resizeCover(r) {
    return ".5+(uv-.5)*vec2(min(ratio/" + r + ",1.),min(" + r + "/ratio,1.))";
  }

  makeFragment(transitionGlsl) {
    return `
    precision highp float;
    varying vec2 _uv;
    uniform sampler2D texture1, texture2;
    uniform float progress, ratio, _fromR, _toR;

    vec4 getFromColor(vec2 uv) {
      return texture2D(texture1, uv);
    }
    vec4 getToColor(vec2 uv){
        return texture2D(texture2, uv);
      }

      ${transitionGlsl}

    void main() {
      gl_FragColor = transition(_uv);
    }

    `;
  }

  constructor(opts) {
    this.clock = new THREE.Clock();
    this.loadManager = new THREE.LoadingManager();
    this.loader = new THREE.TextureLoader(this.loadManager);
    this.delta = 0;
    this.interval = 1 / 60;      // 60 fps
    this.tempImages = [];
    this.currentTransition = "fade";
    this.bcounter = null;
    this.scene = new THREE.Scene();
    /* this.vertex = `
      varying vec2 _uv;
      void main() {
        _uv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );
      }`;
*/
    this.vertex = `
  varying vec2 _uv;
  void main()
   {
     _uv = uv;
     gl_Position = vec4(position, 0.5);
   }
`;
    this.fragment = `
      vec4 transition (vec2 uv) {
        return mix(
        getFromColor(uv),
        getToColor(uv),
        progress);
      }`;

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    //this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(1920, 1080);

    this.duration = opts.duration || 1;
    this.debug = opts.debug || false;
    this.easing = opts.easing || 'easeInOut';
    this.uniforms = {};
    this.nextTexture = null;
    this.tmpImage = false;
    this.container = document.getElementById("slider");
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      70,
      16 / 9,
      0.001,
      1000
    );

    this.camera.position.set(0, 0, 2);
    this.time = 0;
    this.current = 0;
    this.textures = [];
    this.paused = true;

    this.setupResize();
    this.addObjects();
    this.resize();
    this.settings();
    this.play();
  }

  getTextureId(uuid) {
    for (const idx in this.textures) {
      if (this.textures[idx].image && this.textures[idx].image.id == uuid) {
        return idx;
      }
    }
    return undefined;
  }

  clearImages() {
    for (let idx in this.textures) {
      this.textures[idx].dispose();
      this.textures.splice(idx, 1);
    };

    this.current = 0;
  }

  removeImageByUrl(url) {
    const idx = this.getTextureId(url);
    for (const idx in this.textures) {
      if (this.textures[idx].image.src.indexOf(url) !== -1) {
        this.textures[idx].dispose();
        this.textures.splice(idx, 1);
        return;
      }
    }
  }

  removeImageByUuid(uuid) {
    for (const idx in this.textures) {
      if (this.textures[idx].image.id === uuid) {
        this.textures[idx].dispose();
        this.textures.splice(idx, 1);
      }
    }
  }

  async loadImage(url, uuid) {
    const idx = this.getTextureId(uuid);

    if (idx) {
      // replace texture with a new resource
      this.textures[idx].dispose();
      this.textures[idx] = await this.loader.load(url, () => {
        this.textures[idx].minFilter = THREE.LinearFilter;
        this.textures[idx].image.id = uuid;
      });

    } else {
      // load new texture
      const texture = await this.loader.load(url, () => {
        texture.minFilter = THREE.LinearFilter;
        texture.image.id = uuid;
        this.textures.push(texture);
      });
    }
  }

  settings() {
    if (this.debug) {
      if (this.gui) {
        this.gui.destroy();
      }
      this.gui = new dat.GUI();

      this._settings = {};
      Object.keys(this.material.uniforms).forEach((item) => {
        if (!["progress", "texture1", "texture2", "_fromR", "_toR", "ratio", "resolution"].includes(item)) {
          this._settings[item] = this.material.uniforms[item].value;
          if (typeof (this._settings[item]) !== "object") {
            this.gui.add(this._settings, item, 0);
          }
        }
      });
      this.gui.show();
    }
  }

  setupResize() {
    //    window.addEventListener("resize", this.resize.bind(this));
  }

  resize() {
    this.width = 1920; //this.container.offsetWidth;
    this.height = 1080; //this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;

    // image cover
    this.imageAspect = 16 / 9;

    const dist = this.camera.position.z;
    const height = 1;
    this.camera.fov = 2 * (180 / Math.PI) * Math.atan(height / (2 * dist));

    this.plane.scale.x = this.camera.aspect;
    this.plane.scale.y = 1;

    this.camera.updateProjectionMatrix();
  }

  getUniformBase(cur, next) {
    if (!cur) cur = 0;
    if (!next) next = 0;

    return {
      progress: { type: "f", value: 0 },
      texture1: { type: "f", value: this.textures[cur] },
      texture2: { type: "f", value: this.textures[next] },
      ratio: { type: "f", value: 16 / 9 },
      _fromR: { type: "f", value: 16 / 9 },
      _toR: { type: "f", value: 16 / 9 },
    };
  }

  addObjects() {
    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable",
      },
      side: THREE.DoubleSide,
      uniforms: { ...this.getUniformBase() },
      transparent: true,
      // wireframe: true,
      vertexShader: this.vertex,
      fragmentShader: this.makeFragment(this.fragment),
    });

    this.geometry = new THREE.PlaneGeometry(1, 1, 2, 2);
    this.plane = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.plane);
  }

  stop() {
    this.paused = true;
  }

  play() {
    this.paused = false;
    this.render();
  }

  showSlide(uuid, transition) {
    const len = this.textures.length;
    let nextIdx = this.getTextureId(uuid);
    this.nextTexture = this.textures[nextIdx];

    if (len < 1) return;
    if (!this.nextTexture) return;

    if (transition && this.currentTransition != transition && uuid != "temp") {
      this.currentTransition = transition;
      this.changeTransition(transition, this.current, nextIdx);
    }

    if (this.isRunning) {
      this.current = nextIdx;
      this.material.uniforms.texture1.value = this.nextTexture;
      return;
    }
    else {
      this.isRunning = true;
      this.material.uniforms.texture2.value = this.nextTexture;
    }

    this.tmpImage = false;
    let tween = new TWEEN.Tween(this.material.uniforms.progress);
    tween.to({ value: 1.0 }, this.duration)
      .easing(this.easing)
      .onStart(() => {

      })
      .onComplete(() => {
        this.current = nextIdx;
        this.material.uniforms.texture1.value = this.nextTexture;
        this.material.uniforms.progress.value = 0.0;
        this.isRunning = false;
        this.removeImageByUuid('temp');
      }).start();

  }

  async showTempImage(url) {
    this.tmpImage = true;
    await this.loadImage(url, 'temp');
  }


  render(time) {
    if (this.paused) return;
    TWEEN.update(time);

    requestAnimationFrame(this.render.bind(this));
    this.delta += this.clock.getDelta();

    if (this.delta > this.interval) {
      if (this.debug) {
        Object.keys(this._settings).forEach((item) => {
          this.material.uniforms[item].value = this._settings[item];
        });
      }
      this.renderer.render(this.scene, this.camera);
      this.delta = this.delta % this.interval;
    }
  }

  changeTransition(name, cur, next) {
    let transition = window.GLTransitions.find((obj) => {
      return obj.name == name;
    });

    if (transition == undefined) {
      transition = window.GLTransitions[39];
    }

    let uniforms = {};

    for (const key in transition.defaultParams) {
      if (transition.paramsTypes[key] !== "sampler2D") {
        uniforms[key] = { type: transition.paramsTypes[key], value: transition.defaultParams[key] };
      }
    }

    // do the change
    this.material.fragmentShader = this.makeFragment(transition.glsl);
    this.material.uniforms = { ...this.getUniformBase(cur, next), ...uniforms };
    this.material.needsUpdate = true;
    this.settings();
    this.renderer.render(this.scene, this.camera);
  }
}


