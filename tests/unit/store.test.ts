import { createAppStore, DEFAULT_SPEED, MAX_SPEED, MIN_SPEED } from '../../src/store/appStore';

describe('app store (foundation)', () => {
  it('starts with a random 50-value dataset, Bubble Sort, speed 100, preparing', () => {
    const { dataset, datasetSize, algorithmId, speed, run, announcement } =
      createAppStore().getState();
    expect(dataset.original).toHaveLength(50);
    expect(dataset.source).toBe('random');
    expect(dataset.label).toBe('Random · 50 values');
    expect(datasetSize).toBe(50);
    expect(algorithmId).toBe('bubble');
    expect(speed).toBe(DEFAULT_SPEED);
    expect(speed).toBe(100);
    expect(run).toEqual({
      status: 'preparing',
      position: 0,
      total: 0,
      comparisons: 0,
      moves: 0,
      elapsedMs: 0,
      prepareError: false,
    });
    expect(announcement).toBeNull();
  });

  it('generateDataset() uses the chosen size and a new dataset id', () => {
    const store = createAppStore();
    const firstId = store.getState().dataset.id;
    store.getState().setDatasetSize(200);
    store.getState().generateDataset();
    const { dataset } = store.getState();
    expect(dataset.original).toHaveLength(200);
    expect(dataset.label).toBe('Random · 200 values');
    expect(dataset.id).toBe(firstId + 1);
  });

  it.each([
    [5, 10],
    [200, 200],
    [204, 200],
    [1500, 1000],
  ])('setDatasetSize(%d) stores %d', (input, expected) => {
    const store = createAppStore();
    store.getState().setDatasetSize(input);
    expect(store.getState().datasetSize).toBe(expected);
  });

  it('setDataset() stores the values with a new id and source', () => {
    const store = createAppStore();
    const firstId = store.getState().dataset.id;
    store.getState().setDataset([5, 3, 8, 1], 'paste', 'Pasted numbers');
    const { dataset } = store.getState();
    expect(dataset).toMatchObject({
      id: firstId + 1,
      source: 'paste',
      label: 'Pasted numbers',
      original: [5, 3, 8, 1],
    });
  });

  it('a new dataset or algorithm resets the run to preparing', () => {
    const store = createAppStore();
    store.setState({
      run: { ...store.getState().run, status: 'paused', position: 4, total: 10, comparisons: 3 },
    });
    store.getState().generateDataset();
    expect(store.getState().run).toMatchObject({ status: 'preparing', position: 0, total: 0 });

    store.setState({ run: { ...store.getState().run, status: 'finished', position: 10 } });
    store.getState().selectAlgorithm('merge');
    expect(store.getState().algorithmId).toBe('merge');
    expect(store.getState().run).toMatchObject({ status: 'preparing', position: 0 });
  });

  it('selecting the algorithm that is already selected changes nothing', () => {
    const store = createAppStore();
    store.setState({ run: { ...store.getState().run, status: 'paused', position: 4 } });
    store.getState().selectAlgorithm('bubble');
    expect(store.getState().run).toMatchObject({ status: 'paused', position: 4 });
  });

  it.each([
    [1, MIN_SPEED],
    [250, 250],
    [1_000_000, MAX_SPEED],
  ])('setSpeed(%d) stores %d', (input, expected) => {
    const store = createAppStore();
    store.getState().setSpeed(input);
    expect(store.getState().speed).toBe(expected);
  });

  it('announce() sets the text with a fresh seq, even for repeated text', () => {
    const store = createAppStore();
    store.getState().announce('Paused.');
    const first = store.getState().announcement;
    store.getState().announce('Paused.');
    const second = store.getState().announcement;
    expect(first?.text).toBe('Paused.');
    expect(second?.text).toBe('Paused.');
    expect(second?.seq).toBeGreaterThan(first?.seq ?? Infinity);
  });
});
