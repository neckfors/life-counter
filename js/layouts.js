// Layouts for each player count. The phone lies flat in the middle of the table and each player's
// area is rotated to face them:
//   0   = player sits at the bottom edge of the screen
//   180 = player sits at the top edge
//   90  = player sits at the left edge
//   270 = player sits at the right edge
// A layout is a tree: H() places items side by side, V() stacks them, P() is a player's area.
// The same player may appear more than once (shown on both sides of the table).

const P = (player, rot, w = 1) => ({ player, rot, w });
const H = (...items) => ({ dir: 'h', items, w: 1 });
const V = (...items) => ({ dir: 'v', items, w: 1 });
const weight = (node, w) => ({ ...node, w });

export const LAYOUTS = {
  1: [
    { id: 'single', name: 'One player', tree: P(0, 0) },
    { id: 'mirrored', name: 'Shown on both sides', tree: V(P(0, 180), P(0, 0)) },
  ],
  2: [
    { id: 'facing', name: 'One player on each side', tree: V(P(1, 180), P(0, 0)) },
    { id: 'facing-sideways', name: 'One on each side, sideways', tree: H(P(0, 90), P(1, 270)) },
    { id: 'same-side', name: 'Two players on one side', tree: H(P(0, 0), P(1, 0)) },
    { id: 'same-side-sideways', name: 'Two on one side, sideways', tree: V(P(0, 90), P(1, 90)) },
    { id: 'both-sides', name: 'Two players on each side',
      tree: V(H(P(1, 180), P(0, 180)), H(P(0, 0), P(1, 0))) },
  ],
  3: [
    { id: 'two-vs-one', name: 'Two against one', tree: V(H(P(1, 180), P(2, 180)), P(0, 0)) },
    { id: 'end-and-sides', name: 'One at the end, two along the sides',
      tree: V(weight(H(P(1, 90), P(2, 270)), 2), P(0, 0)) },
    { id: 'sideways', name: 'Sideways', tree: H(P(0, 90), V(P(1, 270), P(2, 270))) },
    { id: 'same-way', name: 'All facing the same way', tree: V(P(2, 0), P(1, 0), P(0, 0)) },
  ],
  4: [
    { id: 'two-vs-two', name: 'Two against two',
      tree: V(H(P(2, 180), P(3, 180)), H(P(0, 0), P(1, 0))) },
    { id: 'ends-and-sides', name: 'One at each end, two along the sides',
      tree: V(P(2, 180), weight(H(P(1, 90), P(3, 270)), 2), P(0, 0)) },
    { id: 'sideways', name: 'Two against two, sideways',
      tree: H(V(P(0, 90), P(1, 90)), V(P(2, 270), P(3, 270))) },
    { id: 'same-way', name: 'All facing the same way',
      tree: V(H(P(2, 0), P(3, 0)), H(P(0, 0), P(1, 0))) },
  ],
  5: [
    { id: 'three-vs-two', name: 'Three against two',
      tree: V(H(P(2, 180), P(3, 180), P(4, 180)), H(P(0, 0), P(1, 0))) },
    { id: 'sideways', name: 'Three against two, sideways',
      tree: H(V(P(0, 90), P(1, 90)), V(P(2, 270), P(3, 270), P(4, 270))) },
    { id: 'same-way', name: 'All facing the same way',
      tree: V(P(4, 0), H(P(2, 0), P(3, 0)), H(P(0, 0), P(1, 0))) },
  ],
  6: [
    { id: 'three-vs-three', name: 'Three against three',
      tree: V(H(P(3, 180), P(4, 180), P(5, 180)), H(P(0, 0), P(1, 0), P(2, 0))) },
    { id: 'sideways', name: 'Three against three, sideways',
      tree: H(V(P(0, 90), P(1, 90), P(2, 90)), V(P(3, 270), P(4, 270), P(5, 270))) },
    { id: 'same-way', name: 'All facing the same way',
      tree: V(H(P(4, 0), P(5, 0)), H(P(2, 0), P(3, 0)), H(P(0, 0), P(1, 0))) },
  ],
};

export function getLayout(count, id) {
  return LAYOUTS[count].find(layout => layout.id === id) ?? LAYOUTS[count][0];
}

// Builds the DOM for a layout tree; makeArea(leaf) creates the element for one player's area.
export function buildTree(node, makeArea) {
  let element;
  if (node.items) {
    element = document.createElement('div');
    element.className = `split ${node.dir}`;
    element.append(...node.items.map(item => buildTree(item, makeArea)));
  } else {
    element = makeArea(node);
  }
  element.style.setProperty('--w', node.w);
  return element;
}
