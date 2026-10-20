(() => {
  'use strict';

  class PostsApi {
    #baseUrl;

    constructor(baseUrl) {
      this.#baseUrl = baseUrl;
    }

    async fetchPosts(start, limit) {
      const url = `${this.#baseUrl}/posts?_start=${start}&_limit=${limit}`;

      let response;
      try {
        response = await fetch(url);
      } catch {
        throw new Error('Не удалось подключиться к серверу. Проверьте интернет-соединение.');
      }

      if (!response.ok) {
        throw new Error(`Сервер ответил ошибкой ${response.status}. Попробуйте позже.`);
      }

      try {
        const posts = await response.json();
        const total = Number(response.headers.get('X-Total-Count')) || null;
        return { posts, total };
      } catch {
        throw new Error('Сервер прислал некорректные данные.');
      }
    }
  }

  class PostsModel {
    #posts = [];
    #pageSize;
    #hasMore = true;
    #isLoading = false;
    #error = null;
    #query = '';

    constructor(pageSize) {
      this.#pageSize = pageSize;
    }

    getState() {
      return {
        visiblePosts: this.#filterPosts(),
        loadedCount: this.#posts.length,
        hasMore: this.#hasMore,
        isLoading: this.#isLoading,
        error: this.#error,
        query: this.#query,
      };
    }

    getNextRange() {
      return { start: this.#posts.length, limit: this.#pageSize };
    }

    canLoadMore() {
      return this.#hasMore && !this.#isLoading;
    }

    isFiltering() {
      return this.#query !== '';
    }

    hasError() {
      return this.#error !== null;
    }

    startLoading() {
      this.#isLoading = true;
      this.#error = null;
    }

    addPosts(newPosts, total) {
      this.#posts.push(...newPosts);
      this.#isLoading = false;

      const reachedTotal = total !== null && this.#posts.length >= total;
      const gotLessThanAsked = newPosts.length < this.#pageSize;
      if (reachedTotal || gotLessThanAsked) this.#hasMore = false;
    }

    setError(message) {
      this.#isLoading = false;
      this.#error = message;
    }

    setQuery(query) {
      this.#query = query.trim().toLowerCase();
    }

    #filterPosts() {
      if (!this.#query) return this.#posts.map((post) => ({ ...post }));
      return this.#posts
        .filter((post) => post.title.toLowerCase().includes(this.#query))
        .map((post) => ({ ...post }));
    }
  }

  class PostsView {
    #els;
    #observer = null;
    #preloadDistancePx;
    #cardCache = new Map();

    constructor(elements, { preloadDistancePx }) {
      this.#els = elements;
      this.#preloadDistancePx = preloadDistancePx;
    }

    bindSearch(handler) {
      this.#els.searchInput.addEventListener('input', (event) => {
        handler(event.target.value);
      });
    }

    bindRetry(handler) {
      this.#els.retryBtn.addEventListener('click', handler);
    }

    bindScrollEnd(handler) {
      this.#observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) handler();
        },
        { rootMargin: `0px 0px ${this.#preloadDistancePx}px 0px` }
      );
      this.#observer.observe(this.#els.sentinel);
    }

    isScrollEndVisible() {
      const top = this.#els.sentinel.getBoundingClientRect().top;
      return top <= window.innerHeight + this.#preloadDistancePx;
    }

    render(state) {
      this.#renderPosts(state.visiblePosts);
      this.#renderCounter(state);
      this.#renderLoader(state.isLoading);
      this.#renderError(state.error);
      this.#renderMessage(state);
    }

    #renderPosts(posts) {
      const fragment = document.createDocumentFragment();
      posts.forEach((post) => fragment.append(this.#getPostCard(post)));
      this.#els.list.replaceChildren(fragment);
    }

    #getPostCard(post) {
      let card = this.#cardCache.get(post.id);
      if (!card) {
        card = this.#createPostCard(post);
        card.classList.add('post--new');
        card.addEventListener('animationend', () => card.classList.remove('post--new'), {
          once: true,
        });
        this.#cardCache.set(post.id, card);
      }
      return card;
    }

    #createPostCard(post) {
      const item = document.createElement('li');
      item.className = 'post';
      item.style.setProperty('--author-hue', String((post.userId * 36) % 360));

      const meta = document.createElement('div');
      meta.className = 'post__meta';

      const author = document.createElement('div');
      author.className = 'post__author';
      const avatar = document.createElement('span');
      avatar.className = 'post__avatar';
      avatar.textContent = String(post.userId);
      const authorName = document.createElement('span');
      authorName.textContent = `Автор #${post.userId}`;
      author.append(avatar, authorName);

      const id = document.createElement('span');
      id.className = 'post__id';
      id.textContent = `#${post.id}`;
      meta.append(author, id);

      const title = document.createElement('h2');
      title.className = 'post__title';
      title.textContent = post.title;

      const body = document.createElement('p');
      body.className = 'post__body';
      body.textContent = post.body;

      item.append(meta, title, body);
      return item;
    }

    #renderCounter({ query, visiblePosts, loadedCount }) {
      this.#els.counter.textContent = query
        ? `Найдено: ${visiblePosts.length} из ${loadedCount} загруженных`
        : `Загружено: ${loadedCount}`;
    }

    #renderLoader(isLoading) {
      this.#els.loader.classList.toggle('hidden', !isLoading);
    }

    #renderError(error) {
      this.#els.errorText.textContent = error ?? '';
      this.#els.error.classList.toggle('hidden', error === null);
    }

    #renderMessage({ query, visiblePosts, hasMore, isLoading, error }) {
      let text = '';

      if (error || isLoading) {
        text = '';
      } else if (query && visiblePosts.length === 0) {
        text = 'По вашему запросу ничего не найдено.';
      } else if (query && hasMore) {
        text = 'Поиск идёт по уже загруженным постам. Очистите поле, чтобы подгрузить ещё.';
      } else if (!hasMore) {
        text = 'Больше постов нет';
      }

      this.#els.message.textContent = text;
      this.#els.message.classList.toggle('hidden', text === '');
    }
  }

  class PostsController {
    #api;
    #model;
    #view;
    #searchDelayMs;

    constructor(api, model, view, { searchDelayMs }) {
      this.#api = api;
      this.#model = model;
      this.#view = view;
      this.#searchDelayMs = searchDelayMs;

      this.#view.bindSearch(debounce((value) => this.#handleSearch(value), this.#searchDelayMs));
      this.#view.bindRetry(() => this.#loadNextPage());
      this.#view.bindScrollEnd(() => this.#handleScrollEnd());
    }

    init() {
      this.#render();
      this.#loadNextPage();
    }

    async #loadNextPage() {
      if (!this.#model.canLoadMore()) return;

      this.#model.startLoading();
      this.#render();

      try {
        const { start, limit } = this.#model.getNextRange();
        const { posts, total } = await this.#api.fetchPosts(start, limit);
        this.#model.addPosts(posts, total);
      } catch (error) {
        this.#model.setError(error.message);
      }

      this.#render();

      if (this.#shouldAutoLoad() && this.#view.isScrollEndVisible()) {
        this.#loadNextPage();
      }
    }

    #handleScrollEnd() {
      if (this.#shouldAutoLoad()) this.#loadNextPage();
    }

    #shouldAutoLoad() {
      return this.#model.canLoadMore() && !this.#model.isFiltering() && !this.#model.hasError();
    }

    #handleSearch(value) {
      this.#model.setQuery(value);
      this.#render();

      if (this.#shouldAutoLoad() && this.#view.isScrollEndVisible()) {
        this.#loadNextPage();
      }
    }

    #render() {
      this.#view.render(this.#model.getState());
    }
  }

  function debounce(fn, delayMs) {
    let timerId = null;
    return (...args) => {
      clearTimeout(timerId);
      timerId = setTimeout(() => fn(...args), delayMs);
    };
  }

  const config = Object.freeze({
    apiUrl: 'https://jsonplaceholder.typicode.com',
    pageSize: 10,
    preloadDistancePx: 200,
    searchDelayMs: 300,
  });

  const api = new PostsApi(config.apiUrl);
  const model = new PostsModel(config.pageSize);
  const view = new PostsView(
    {
      list: document.getElementById('posts-list'),
      counter: document.getElementById('counter'),
      searchInput: document.getElementById('search-input'),
      loader: document.getElementById('loader'),
      error: document.getElementById('error'),
      errorText: document.getElementById('error-text'),
      retryBtn: document.getElementById('retry-btn'),
      message: document.getElementById('message'),
      sentinel: document.getElementById('sentinel'),
    },
    config
  );
  const controller = new PostsController(api, model, view, config);
  controller.init();
})();