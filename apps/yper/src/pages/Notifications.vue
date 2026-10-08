<template>
  <AppShell :title="$t('notifications.title')">
    <div class="notifications-layout">
      <p v-if="error" role="alert" class="alert alert-danger">{{ error }}</p>
      <p v-if="message" role="status" class="alert alert-success">{{ message }}</p>
      <section class="card">
        <div class="card-head"><h2>{{ $t('notifications.deviceTitle') }}</h2></div>
        <div class="card-body">
          <p>{{ $t(`notifications.${availability}`) }}</p>
          <p v-if="device">{{ $t('notifications.active') }}</p>
          <div class="row notification-actions">
            <button class="btn btn-primary" :disabled="busy || loading || availability !== 'ready'" @click="enable">{{ $t('notifications.enable') }}</button>
            <button v-if="device" class="btn" :disabled="busy" @click="test">{{ $t('notifications.test') }}</button>
            <button v-if="device" class="btn" :disabled="busy" @click="disable">{{ $t('notifications.disable') }}</button>
          </div>
        </div>
      </section>
      <form v-if="preferences" @submit.prevent="save">
        <section class="card">
          <div class="card-head"><h2>{{ $t('notifications.schedule') }}</h2></div>
          <div class="card-body">
            <p>{{ $t('notifications.scheduleHint') }}</p>
            <div class="field"><label for="notification-timezone">{{ $t('notifications.timezone') }}</label><input id="notification-timezone" v-model="preferences.timezone" required /></div>
            <fieldset v-for="item in preferences.reminders" :key="item.kind" class="reminder">
              <legend>{{ $t(`notifications.kinds.${item.kind}`) }}</legend>
              <div class="reminder-controls">
                <label><input v-model="item.enabled" type="checkbox" /> {{ $t('notifications.enabled') }}</label>
                <label>{{ $t('notifications.time') }} <input v-model="item.time" type="time" required :disabled="!item.enabled" /></label>
              </div>
              <div class="reminder-days">
                <label v-for="day in 7" :key="day"><input v-model="item.days" type="checkbox" :value="day - 1" :disabled="!item.enabled" /> {{ $t(`notifications.days.${day - 1}`) }}</label>
              </div>
            </fieldset>
            <button type="submit" class="btn btn-primary" :disabled="busy">{{ $t('common.save') }}</button>
          </div>
        </section>
      </form>
      <section v-if="devices.length" class="card">
        <div class="card-head"><h2>{{ $t('notifications.devices') }}</h2></div>
        <div class="card-body">
          <div v-for="(item, index) in devices" :key="item._id" class="row notification-actions">
            <span>{{ item._id === device?.id ? $t('notifications.thisDevice') : $t('notifications.otherDevice', { n: index + 1 }) }}</span>
            <button class="btn" :disabled="busy" @click="removeDevice(item._id)">{{ $t('notifications.disable') }}</button>
          </div>
        </div>
      </section>
    </div>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { errorMessage } from '@yper/i18n';
import { api, session } from '@/api';
import { pushAvailability, deviceFor, enablePush, disablePush } from '../push.js';

export default {
  components: { AppShell },
  data: () => ({ preferences: null, devices: [], device: null, availability: 'unsupported', busy: false, loading: true, message: '', error: '' }),
  async mounted() { await this.load(); },
  methods: {
    async load() {
      try {
        const data = await api.get('/notifications');
        this.preferences = data.preferences;
        this.devices = data.devices;
        const local = deviceFor(session.getUser()?.id);
        this.device = data.devices.some(item => item._id === local?.id) ? local : null;
        this.availability = data.configured ? pushAvailability() : 'unconfigured';
      } catch (err) { this.error = errorMessage(this.$t, err); }
      finally { this.loading = false; }
    },
    async action(work) {
      this.busy = true; this.error = ''; this.message = '';
      try { await work(); }
      catch (err) { this.error = ['denied', 'dismissed', 'unsupported'].includes(err.message) ? this.$t(`notifications.${err.message}`) : errorMessage(this.$t, err); }
      finally { this.busy = false; }
    },
    enable() {
      // action invokes this callback synchronously, preserving the permission click gesture.
      return this.action(async () => {
        this.device = await enablePush(api, session.getUser()?.id);
        await this.persist();
        await this.load();
        this.message = this.$t('notifications.activated');
      });
    },
    disable() { return this.action(async () => { await disablePush(api, session.getUser()?.id); await this.load(); }); },
    removeDevice(id) { return id === this.device?.id ? this.disable() : this.action(async () => { await api.del(`/notifications/devices/${id}`); await this.load(); }); },
    test() { return this.action(async () => { await api.post(`/notifications/devices/${this.device.id}/test`); this.message = this.$t('notifications.testSent'); }); },
    async persist() { await api.put('/notifications/preferences', { ...this.preferences, locale: this.$i18n.locale }); },
    save() { return this.action(async () => { await this.persist(); this.message = this.$t('notifications.saved'); }); },
  },
};
</script>

<style scoped>
.notifications-layout { max-width: 760px; display: grid; gap: 16px; }
.notification-actions { flex-wrap: wrap; gap: 12px; margin-block: 12px; }
.reminder { min-width: 0; border: 1px solid var(--border); border-radius: 8px; margin: 20px 0; padding: 12px; }
.reminder-controls, .reminder-days { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.reminder-days { margin-top: 12px; }
.reminder label { display: flex; align-items: center; gap: 8px; min-height: 44px; }
.reminder input[type='checkbox'] { width: 20px; height: 20px; }
.reminder input[type='time'] { width: auto; }
</style>
