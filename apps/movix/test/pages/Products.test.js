import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mountPage } from '@yper/test-utils';
import { DOMWrapper, flushPromises } from '@vue/test-utils';
import { currency } from '@yper/i18n';
import ptBR from '../../src/locales/pt-BR.json';

vi.mock('@/api', async () => {
  const { createFakeApi } = await import('@yper/test-utils');
  const client = createFakeApi();
  return { ...client, default: client };
});

import client, { api } from '@/api';

import Products from '../../src/pages/Products.vue';

const PRODUCTS = [
  {
    _id: 'p1', name: 'Arroz', sku: 'AR-1', barcode: '111', category: 'Grãos', unit: 'kg',
    currentStock: 50, minimumStock: 10, belowMinimum: false, costPrice: 3, salePrice: 5,
    stockValue: 150, supplier: { _id: 's1', name: 'Fornecedor A' },
  },
  {
    _id: 'p2', name: 'Feijão', sku: 'FJ-2', barcode: '222', category: 'Grãos', unit: 'kg',
    currentStock: 2, minimumStock: 10, belowMinimum: true, costPrice: 4, salePrice: 7,
    stockValue: 8, supplier: null,
  },
  {
    _id: 'p3', name: 'Óleo', sku: 'OL-3', barcode: '333', category: 'Óleos', unit: 'L',
    currentStock: 0, minimumStock: 5, belowMinimum: true, costPrice: 6, salePrice: 9,
    stockValue: 0, supplier: null,
  },
];

const SUPPLIERS = [{ _id: 's1', name: 'Fornecedor A' }, { _id: 's2', name: 'Fornecedor B' }];

let activeWrapper;

async function mountProducts(route = '/produtos') {
  const ctx = await mountPage(Products, { messages: ptBR, api: client, route });
  activeWrapper = ctx.wrapper;
  return ctx;
}

function findButtonByTitle(wrapper, title) {
  return wrapper.findAll('.btn-icon').find((btn) => btn.attributes('title') === title);
}

afterEach(() => {
  activeWrapper?.unmount();
  activeWrapper = undefined;
});

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (path) => {
    if (path === '/products') return { products: structuredClone(PRODUCTS) };
    if (path === '/suppliers') return { suppliers: structuredClone(SUPPLIERS) };
    return [];
  });
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});

describe('Products', () => {
  it('carrega produtos e fornecedores, renderiza a tabela', async () => {
    const { wrapper } = await mountProducts();

    expect(api.get).toHaveBeenCalledWith('/products');
    expect(api.get).toHaveBeenCalledWith('/suppliers');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(wrapper.text()).toContain('3 de 3');
    expect(wrapper.text()).toContain(currency(3));
    expect(wrapper.text()).toContain('Fornecedor A');
  });

  it('mostra o badge de estoque correto para cada produto', async () => {
    const { wrapper } = await mountProducts();

    const rows = wrapper.findAll('tbody tr');
    expect(rows[0].find('.badge').classes()).toContain('badge-ok'); // Arroz: acima do minimo
    expect(rows[1].find('.badge').classes()).toContain('badge-warn'); // Feijao: abaixo do minimo, saldo > 0
    expect(rows[2].find('.badge').classes()).toContain('badge-danger'); // Oleo: saldo zerado
  });

  it('filtra por texto de busca', async () => {
    const { wrapper } = await mountProducts();

    await wrapper.find('input[type="search"]').setValue('feij');

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(1);
    expect(rows[0].text()).toContain('Feijão');
    expect(wrapper.text()).toContain('1 de 3');
  });

  it('filtra somente os abaixo do minimo', async () => {
    const { wrapper } = await mountProducts();

    await wrapper.find('input[type="checkbox"]').setValue(true);

    const rows = wrapper.findAll('tbody tr');
    expect(rows.map((row) => row.text())).toEqual([
      expect.stringContaining('Feijão'),
      expect.stringContaining('Óleo'),
    ]);
  });

  it('mostra mensagem de "primeiro produto" quando a lista esta vazia', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/products') return { products: [] };
      if (path === '/suppliers') return { suppliers: [] };
      return [];
    });

    const { wrapper } = await mountProducts();

    expect(wrapper.text()).toContain('Cadastre seu primeiro produto.');
  });

  it('mostra mensagem de filtro sem resultado', async () => {
    const { wrapper } = await mountProducts();

    await wrapper.find('input[type="search"]').setValue('inexistente');

    expect(wrapper.text()).toContain('Nenhum produto com esse filtro.');
  });

  it('cria um novo produto e recarrega a lista', async () => {
    const { wrapper } = await mountProducts();
    const body = new DOMWrapper(document.body);

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo produto')).trigger('click');
    expect(body.find('[role="dialog"]').exists()).toBe(true);
    expect(body.find('h3').text()).toBe('Novo produto');

    await body.find('#name').setValue('Macarrão');
    await body.find('#sku').setValue('MC-1');
    await body.find('#barcode').setValue('999');
    await body.find('#category').setValue('Massas');
    await body.find('#unit').setValue('kg');
    await body.find('#supplier').setValue('s2');
    await body.find('#costPrice').setValue('2.5');
    await body.find('#salePrice').setValue('4.5');
    await body.find('#minimumStock').setValue('5');
    await body.find('#currentStock').setValue('20');

    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.post).toHaveBeenCalledWith('/products', {
      name: 'Macarrão', sku: 'MC-1', barcode: '999', category: 'Massas', unit: 'kg',
      costPrice: 2.5, salePrice: 4.5, minimumStock: 5, currentStock: 20, supplier: 's2',
    });
    expect(api.get).toHaveBeenCalledWith('/products'); // recarregou
    expect(body.find('[role="dialog"]').exists()).toBe(false);
  });

  it('edita um produto existente sem o campo de estoque inicial', async () => {
    const { wrapper } = await mountProducts();
    const body = new DOMWrapper(document.body);

    await findButtonByTitle(wrapper, 'Editar').trigger('click');

    expect(body.find('h3').text()).toBe('Editar produto');
    expect(body.find('#name').element.value).toBe('Arroz');
    expect(body.find('#supplier').element.value).toBe('s1');
    expect(body.find('#currentStock').exists()).toBe(false);

    await body.find('#salePrice').setValue('5.5');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(api.put).toHaveBeenCalledWith('/products/p1', {
      name: 'Arroz', sku: 'AR-1', barcode: '111', category: 'Grãos', unit: 'kg',
      costPrice: 3, salePrice: 5.5, minimumStock: 10, supplier: 's1',
    });
  });

  it('remove um produto quando a confirmacao e aceita', async () => {
    const { wrapper } = await mountProducts();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await findButtonByTitle(wrapper, 'Remover').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith('Remover "Arroz"?');
    expect(api.del).toHaveBeenCalledWith('/products/p1');
    expect(api.get).toHaveBeenCalledWith('/products');
  });

  it('nao remove quando a confirmacao e recusada', async () => {
    const { wrapper } = await mountProducts();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await findButtonByTitle(wrapper, 'Remover').trigger('click');
    await flushPromises();

    expect(api.del).not.toHaveBeenCalled();
  });

  it('navega para movimentacoes com o produto selecionado', async () => {
    const { wrapper, router } = await mountProducts();

    await findButtonByTitle(wrapper, 'Movimentar').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/movimentacoes');
    expect(router.currentRoute.value.query.produto).toBe('p1');
  });

  it('erro ao carregar produtos mostra alerta traduzido', async () => {
    api.get.mockImplementation(async (path) => {
      if (path === '/products') throw { code: 'NETWORK' };
      return { suppliers: [] };
    });

    await mountProducts();

    expect(window.alert).toHaveBeenCalledWith('Não foi possível falar com o servidor. Tente de novo.');
  });

  it('erro ao salvar mostra a mensagem do erro', async () => {
    const { wrapper } = await mountProducts();
    const body = new DOMWrapper(document.body);
    api.post.mockRejectedValueOnce({ message: 'Nome invalido' });

    await wrapper.findAll('button').find((btn) => btn.text().includes('Novo produto')).trigger('click');
    await body.find('#name').setValue('Teste');
    await body.find('form').trigger('submit');
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith('Nome invalido');
  });
});
