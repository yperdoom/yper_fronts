<template>
  <div :class="$style.shell">
    <aside :class="[$style.sidebar, open && $style.sidebarOpen]">
      <div :class="$style.brand">
        <!-- A marca e escura demais para o fundo da sidebar, entao vai num chip branco. -->
        <img
          v-show="!logoFailed"
          :src="shell.logoUrl"
          :alt="shell.appName"
          :class="$style.brandLogo"
          @error="logoFailed = true"
        />
        <span v-if="logoFailed" :class="$style.brandMark">{{ shell.appName.charAt(0) }}</span>
        <span :class="$style.brandName">{{ shell.appName }}</span>
      </div>

      <nav :class="$style.nav">
        <router-link
          v-for="item in shell.nav"
          :key="item.to"
          :to="item.to"
          :class="$style.navItem"
          :active-class="$style.navItemActive"
          @click="open = false"
        >
          <span class="material-symbols-outlined">{{ item.icon }}</span>
          <span>{{ $t(item.labelKey) }}</span>
        </router-link>
      </nav>

      <div :class="$style.sidebarFoot">
        <div :class="$style.prefs">
          <div role="group" :aria-label="$t('common.language')" :class="$style.segmented">
            <button
              v-for="locale in locales"
              :key="locale"
              type="button"
              :class="[$style.segment, locale === $i18n.locale && $style.segmentActive]"
              :aria-pressed="String(locale === $i18n.locale)"
              @click="setLocale(locale)"
            >
              {{ locale.slice(0, 2).toUpperCase() }}
            </button>
          </div>
        </div>
        <div :class="$style.user">
          <span class="material-symbols-outlined">account_circle</span>
          <span :class="$style.userEmail">{{ user?.email || '—' }}</span>
        </div>
        <router-link
          v-if="isAdmin"
          to="/users"
          :class="$style.navItem"
          :active-class="$style.navItemActive"
          @click="open = false"
        >
          <span class="material-symbols-outlined">group</span>
          <span>{{ $t('users.title') }}</span>
        </router-link>
        <router-link
          to="/account/password"
          :class="$style.navItem"
          :active-class="$style.navItemActive"
          @click="open = false"
        >
          <span class="material-symbols-outlined">key</span>
          <span>{{ $t('account.changePassword') }}</span>
        </router-link>
        <button type="button" :class="$style.logout" @click="signOut">
          <span class="material-symbols-outlined">logout</span>
          <span>{{ $t('common.logout') }}</span>
        </button>
      </div>
    </aside>

    <div v-if="open" :class="$style.backdrop" @click="open = false"></div>

    <div :class="$style.main">
      <header :class="$style.topbar">
        <button type="button" :class="$style.menuBtn" @click="open = !open">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <h2 :class="$style.topTitle">{{ title }}</h2>
        <div class="spacer"></div>
        <slot name="actions" />
      </header>

      <main :class="$style.content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script>
import { SUPPORTED_LOCALES, saveLocale } from '@yper/i18n';
import { SHELL_KEY } from './createShell.js';

export default {
  name: 'AppShell',
  props: {
    title: { type: String, default: '' },
  },
  inject: {
    shell: { from: SHELL_KEY },
  },
  data() {
    return {
      open: false,
      user: this.shell.api.session.getUser(),
      isAdmin: this.shell.api.session.isAdmin(),
      logoFailed: false,
      locales: SUPPORTED_LOCALES,
    };
  },
  async mounted() {
    // Atualiza papel/apps/nome ao abrir o app, sem exigir relogin apos mudanca.
    // Falha (ex: rede, ou 401 que ja dispara logout via onUnauthorized) e ignorada.
    try {
      await this.shell.api.auth.me();
    } catch {
      return;
    }
    this.user = this.shell.api.session.getUser();
    this.isAdmin = this.shell.api.session.isAdmin();
  },
  methods: {
    setLocale(locale) {
      this.$i18n.locale = locale;
      saveLocale(this.shell.api.app, locale);
    },
    signOut() {
      this.shell.api.auth.logout();
      this.$router.push('/');
    },
  },
};
</script>

<style module>
.shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 40;
  width: var(--sidebar-width);
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  transition: transform 0.22s ease;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 14px;
}

.brandLogo {
  width: 30px;
  height: 30px;
  padding: 3px;
  object-fit: contain;
  border-radius: 7px;
  background: #fff;
}

.brandMark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 700;
}

.brandName {
  color: #fff;
  font-weight: 600;
  font-size: 1.02rem;
  letter-spacing: -0.01em;
}

.nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 10px;
  overflow-y: auto;
}

.navItem {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  color: var(--sidebar-text);
  font-weight: 500;
  transition: background 0.15s, color 0.15s;
}

.navItem:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text-active);
}

.navItemActive {
  background: var(--accent);
  color: var(--accent-contrast);
}

.navItemActive:hover {
  background: var(--accent);
  color: var(--accent-contrast);
}

.sidebarFoot {
  padding: 12px 10px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.prefs {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 11px 8px;
}

.segmented {
  display: inline-flex;
  padding: 2px;
  border-radius: var(--radius-sm);
  background: var(--sidebar-hover);
}

.segment {
  padding: 3px 9px;
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--sidebar-text);
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.segment:hover {
  color: var(--sidebar-text-active);
}

.segmentActive {
  background: var(--accent);
  color: var(--accent-contrast);
}

.segmentActive:hover {
  color: var(--accent-contrast);
}

.user {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 6px 11px;
  color: var(--sidebar-text);
  min-width: 0;
}

.userEmail {
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 11px;
  font: inherit;
  font-weight: 500;
  color: var(--sidebar-text);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.logout:hover {
  background: var(--sidebar-hover);
  color: var(--sidebar-text-active);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 35;
  background: rgba(15, 23, 42, 0.45);
}

.main {
  flex: 1;
  min-width: 0;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 58px;
  padding: 0 22px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.topTitle {
  font-size: 1rem;
}

.menuBtn {
  display: none;
  padding: 6px;
  color: var(--text);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.content {
  flex: 1;
  padding: 22px;
  max-width: 1280px;
  width: 100%;
}

@media (max-width: 900px) {
  .sidebar {
    transform: translateX(-100%);
  }

  .sidebarOpen {
    transform: translateX(0);
  }

  .main {
    margin-left: 0;
  }

  .menuBtn {
    display: block;
  }

  .content {
    padding: 16px;
  }

  .topbar {
    padding: 0 14px;
  }
}
</style>
