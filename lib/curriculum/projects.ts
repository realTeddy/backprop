/**
 * Mapping from curriculum `project` ids to the runtime hint used on the
 * learn page. `pyodide` topics get an in-page Python cell; `colab` topics
 * get a deep link to the corresponding notebook in `/notebooks`.
 *
 * Heavy training (CNN, GPT) goes to Colab because Pyodide's torch support
 * is incomplete. NumPy / scalar autograd / bigram counting all work in
 * Pyodide today.
 */
export type Runtime = "pyodide" | "colab";

export type ProjectMeta = {
  runtime: Runtime;
  notebook?: string; // path under /notebooks for colab projects
  starter?: string; // initial code for pyodide projects
};

export const PROJECTS: Record<string, ProjectMeta> = {
  "numpy-warmup": {
    runtime: "pyodide",
    starter:
      "import numpy as np\n" +
      "x = np.array([1, 2, 3, 4])\n" +
      "print('mean:', x.mean())\n" +
      "print('shape:', x.shape)\n",
  },
  "micrograd-mini": {
    runtime: "pyodide",
    starter:
      "# A scalar autograd tape, micrograd-style.\n" +
      "class Value:\n" +
      "    def __init__(self, data, _children=()):\n" +
      "        self.data = data\n" +
      "        self.grad = 0.0\n" +
      "        self._prev = set(_children)\n" +
      "        self._backward = lambda: None\n\n" +
      "    def __add__(self, other):\n" +
      "        out = Value(self.data + other.data, (self, other))\n" +
      "        def _backward():\n" +
      "            self.grad += out.grad\n" +
      "            other.grad += out.grad\n" +
      "        out._backward = _backward\n" +
      "        return out\n\n" +
      "a, b = Value(2.0), Value(3.0)\n" +
      "c = a + b\n" +
      "c.grad = 1.0\n" +
      "c._backward()\n" +
      "print(a.grad, b.grad)  # both 1.0\n",
  },
  "mnist-mlp": {
    runtime: "pyodide",
    starter:
      "# A tiny MLP forward pass. Replace with the full training loop\n" +
      "# once you've worked through forward/backward by hand.\n" +
      "import numpy as np\n" +
      "rng = np.random.default_rng(0)\n" +
      "W1 = rng.normal(size=(784, 32)) * 0.01\n" +
      "b1 = np.zeros(32)\n" +
      "x = rng.normal(size=(8, 784))\n" +
      "h = np.maximum(0, x @ W1 + b1)\n" +
      "print('hidden activations shape:', h.shape)\n",
  },
  "mnist-cnn": {
    runtime: "colab",
    notebook: "mnist-cnn.ipynb",
  },
  "makemore-bigram": {
    runtime: "pyodide",
    starter:
      "# Char-level bigram counts and sampling.\n" +
      "names = ['emma', 'olivia', 'ava', 'isabella', 'sophia']\n" +
      "from collections import Counter\n" +
      "bigrams = Counter()\n" +
      "for n in names:\n" +
      "    chs = ['.'] + list(n) + ['.']\n" +
      "    for a, b in zip(chs, chs[1:]):\n" +
      "        bigrams[(a, b)] += 1\n" +
      "print(bigrams.most_common(10))\n",
  },
  "makemore-mlp": {
    runtime: "pyodide",
    starter:
      "# Sketch the MLP language model: embed context window, MLP, softmax.\n" +
      "# Fill in the training loop once you've internalized the bigram one.\n",
  },
  "attention-from-scratch": {
    runtime: "pyodide",
    starter:
      "import numpy as np\n" +
      "T, d = 4, 8\n" +
      "rng = np.random.default_rng(0)\n" +
      "X = rng.normal(size=(T, d))\n" +
      "Wq, Wk, Wv = (rng.normal(size=(d, d)) for _ in range(3))\n" +
      "Q, K, V = X @ Wq, X @ Wk, X @ Wv\n" +
      "scores = Q @ K.T / np.sqrt(d)\n" +
      "mask = np.tril(np.ones_like(scores))\n" +
      "scores = np.where(mask == 0, -np.inf, scores)\n" +
      "weights = np.exp(scores - scores.max(axis=-1, keepdims=True))\n" +
      "weights /= weights.sum(axis=-1, keepdims=True)\n" +
      "out = weights @ V\n" +
      "print(out.shape, out.round(3))\n",
  },
  "small-gpt": {
    runtime: "colab",
    notebook: "small-gpt.ipynb",
  },
};
