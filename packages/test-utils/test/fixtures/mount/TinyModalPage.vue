<template>
  <AppShell title="Tiny">
    <Modal :show="show" title="Tiny modal">
      <p data-testid="modal-content">Ola do modal</p>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';

export default {
  name: 'TinyModalPage',
  components: { AppShell, Modal },
  data() {
    return { show: false };
  },
};
</script>
