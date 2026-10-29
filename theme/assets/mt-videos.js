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
          player = tpl.content.firstElementChild.cloneNode(true);
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
        this.querySelectorAll('img, .mt-video-play').forEach((el) => el.remove());
        this.classList.add('is-playing');
        this.appendChild(player);
        if (player.tagName === 'VIDEO') player.play().catch(() => {});
        player.focus();
      }
    }
  );
}
