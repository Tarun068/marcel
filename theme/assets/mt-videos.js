/* Marcel expert videos: loads the player only when the visitor presses play. */
if (!customElements.get('mt-video')) {
  customElements.define(
    'mt-video',
    class MtVideo extends HTMLElement {
      connectedCallback() {
        const btn = this.querySelector('.mt-video-play');
        if (btn) btn.addEventListener('click', () => this.play(), { once: true });
      }

      play() {
        const { kind, id, title } = this.dataset;
        let player;
        if (kind === 'hosted') {
          const tpl = this.querySelector('template');
          if (!tpl) return;
          // importNode, not cloneNode: a video copied inside the template's inert document never picks its source.
          player = document.importNode(tpl.content.firstElementChild, true);
        } else {
          player = document.createElement('iframe');
          player.src =
            kind === 'vimeo'
              ? `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1`
              : `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
          player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
          player.allowFullscreen = true;
          player.title = title || '';
        }
        // Shopify's video_tag adds muted with autoplay, and loading="lazy", which newer browsers honour on video and
        // then never fetch a player added after the click. The visitor pressed play, so load now and start with sound
        // (falls back to muted only if the browser still refuses).
        if (player.tagName === 'VIDEO') {
          player.removeAttribute('loading');
          player.removeAttribute('muted');
          player.defaultMuted = false;
          player.muted = false;
        }
        this.querySelectorAll('img, .mt-video-play').forEach((el) => el.remove());
        this.classList.add('is-playing');
        this.appendChild(player);
        if (player.tagName === 'VIDEO') {
          player.load();
          player.play().catch(() => {
            player.muted = true;
            player.play().catch(() => {});
          });
        }
        player.focus();
      }
    }
  );
}
