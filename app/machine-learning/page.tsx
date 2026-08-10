import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import Practice from "@/components/Practice";
import PyRunner from "@/components/PyRunner";
import { SpecList } from "@/components/Spec";
import { M, MB } from "@/components/Math";
import {
  ConfusionMatrix,
  LearningTypes,
  NeuralNetwork,
  Overfitting,
  TrainingLoop,
} from "@/components/figures/dbMl";

export const metadata: Metadata = { title: "Machine learning" };

export default function MachineLearningPage() {
  return (
    <>
      <PageHead
        code="A4 · Machine learning"
        title="Machine learning"
        lede="Programs that are not told the rule, but work it out from examples — and the ways that goes wrong."
      />

      <div className="prose">
        <p>
          Ordinary programming is: here are the rules, apply them to the data.
          Machine learning inverts it: here is the data and here are the
          answers, work out the rules. You would struggle to write down rules
          that separate a photograph of a cat from one of a dog. You would find
          it much easier to collect ten thousand labelled photographs.
        </p>
        <p>
          Nothing on this page understands anything. A model is a large pile of
          numbers, adjusted until its output stops disagreeing with the
          examples. That is worth holding onto, because it explains every
          limitation later in the topic.
        </p>
      </div>

      <h2 className="display">Three kinds of learning</h2>
      <LearningTypes />

      <SpecList
        title="Which is which"
        meta="A4"
        termWidth="10rem"
        rows={[
          {
            term: "Supervised",
            body: (
              <>
                Training data comes with the right answers attached
                (&ldquo;labels&rdquo;). Splits into{" "}
                <strong>classification</strong>, predicting a category — spam or
                not, which digit — and <strong>regression</strong>, predicting a
                number, such as a house price. Needs labelled data, which is
                expensive because a human usually has to make it.
              </>
            ),
          },
          {
            term: "Unsupervised",
            body: (
              <>
                No labels. The model looks for structure by itself:{" "}
                <strong>clustering</strong> groups similar items, and{" "}
                <strong>dimensionality reduction</strong> compresses many
                features into a few. Used when you do not know in advance what
                you are looking for — grouping customers by buying habits.
              </>
            ),
          },
          {
            term: "Reinforcement",
            body: (
              <>
                An agent acts in an environment and receives rewards or
                penalties, learning a policy that maximises reward over time. No
                answer key exists, only consequences. Used for games, robotics
                and control problems.
              </>
            ),
          },
        ]}
      />

      <h2 className="display">The vocabulary</h2>
      <SpecList
        title="Terms you will be asked to define"
        termWidth="10rem"
        rows={[
          { term: "Feature", body: "One measurable input the model sees. For a house: floor area, number of bedrooms, distance to a station." },
          { term: "Label", body: "The correct answer for a training example." },
          { term: "Model", body: "The thing being trained — the structure plus all its current numbers." },
          { term: "Weight", body: "One of those numbers, saying how strongly one input influences the result." },
          { term: "Bias", body: "An offset added alongside the weights, letting a model shift its output up or down independently of the inputs. Distinct from bias in the ethical sense below." },
          { term: "Loss function", body: "How wrong the model was on an example, as a single number. Training is the search for weights that make this small." },
          { term: "Epoch", body: "One complete pass through the whole training set." },
          { term: "Learning rate", body: "How big a step to take when adjusting weights. Too big and it overshoots forever; too small and it takes an age." },
          { term: "Hyperparameter", body: "A setting you choose before training, such as the learning rate, rather than one the model learns." },
        ]}
      />

      <h2 className="display">How training actually works</h2>
      <TrainingLoop />

      <div className="prose">
        <p>
          The loop is the entire idea. Predict, compare, measure how wrong,
          adjust slightly in the direction that would have been less wrong, and
          repeat — a process called <strong>gradient descent</strong>. Imagine
          walking downhill in thick fog: you cannot see the valley, but you can
          feel which way the ground slopes, and you step that way.
        </p>
        <p>
          The size of your step is the learning rate. Stride too far and you
          cross the valley and end up higher on the other side. Shuffle too
          cautiously and night falls before you arrive.
        </p>
      </div>

      <PyRunner
        caption="Gradient descent in about twenty lines, no libraries. It learns the relationship between hours revised and exam mark from five examples."
        code={`# Learn: mark = w * hours + b, from five examples.
data = [(1, 32), (2, 44), (3, 51), (4, 66), (5, 72)]

w, b = 0.0, 0.0
learning_rate = 0.01

for epoch in range(2001):
    # Predict, then measure how wrong we are.
    total_loss = 0.0
    grad_w = grad_b = 0.0
    for hours, actual in data:
        predicted = w * hours + b
        error = predicted - actual
        total_loss += error ** 2
        grad_w += 2 * error * hours
        grad_b += 2 * error

    n = len(data)
    # Step downhill.
    w -= learning_rate * grad_w / n
    b -= learning_rate * grad_b / n

    if epoch % 500 == 0:
        print(f"epoch {epoch:>4}  loss {total_loss/n:8.2f}  "
              f"mark = {w:.2f} x hours + {b:.2f}")

print()
print("Learned rule:", f"mark = {w:.2f} * hours + {b:.2f}")
print("Predict 6 hours ->", round(w * 6 + b, 1))

# Nothing here understood revision. It found two numbers.`}
      />

      <h2 className="display">Neural networks</h2>
      <NeuralNetwork />

      <div className="prose">
        <p>
          A neural network stacks that same idea. Each{" "}
          <strong>neuron</strong> takes its inputs, multiplies each by a weight,
          adds them up along with a bias, and passes the total through an{" "}
          <strong>activation function</strong> that decides how strongly to
          fire.
        </p>
        <MB>{"\\text{output} = f\\left(\\sum_i w_i x_i + b\\right)"}</MB>
        <p>
          The activation function has to be non-linear, or the whole network
          collapses mathematically into a single straight line no matter how
          many layers you stack. The common choice, <M>{"\\text{ReLU}"}</M>, is
          almost comically simple: keep positive numbers, replace negatives with
          zero.
        </p>
        <p>
          Layers between input and output are <strong>hidden layers</strong>.
          Early layers in an image network detect edges; later ones combine
          edges into shapes, and shapes into objects. Nobody programs that
          hierarchy — it is what minimising the loss happens to produce.{" "}
          <strong>Deep learning</strong> simply means a network with many hidden
          layers.
        </p>
      </div>

      <PyRunner
        caption="A single neuron learning XOR fails, because XOR is not linearly separable — the same XOR from the logic pages. Add one hidden layer and it succeeds. This is the historical objection that stalled neural networks for years."
        code={`import random
math_exp = __import__("math").exp
random.seed(7)

def sigmoid(x):
    return 1 / (1 + math_exp(-x))

XOR = [((0, 0), 0), ((0, 1), 1), ((1, 0), 1), ((1, 1), 0)]

def train(hidden_size, epochs=6000, lr=0.5):
    # weights: input -> hidden, hidden -> output
    wh = [[random.uniform(-1, 1) for _ in range(2)] for _ in range(hidden_size)]
    bh = [random.uniform(-1, 1) for _ in range(hidden_size)]
    wo = [random.uniform(-1, 1) for _ in range(hidden_size)]
    bo = random.uniform(-1, 1)

    for _ in range(epochs):
        for (x1, x2), target in XOR:
            h = [sigmoid(wh[j][0]*x1 + wh[j][1]*x2 + bh[j]) for j in range(hidden_size)]
            out = sigmoid(sum(wo[j]*h[j] for j in range(hidden_size)) + bo)

            d_out = (out - target) * out * (1 - out)
            d_h = [d_out * wo[j] * h[j] * (1 - h[j]) for j in range(hidden_size)]

            for j in range(hidden_size):
                wo[j] -= lr * d_out * h[j]
            bo -= lr * d_out
            for j in range(hidden_size):
                wh[j][0] -= lr * d_h[j] * x1
                wh[j][1] -= lr * d_h[j] * x2
                bh[j]    -= lr * d_h[j]

    def predict(x1, x2):
        h = [sigmoid(wh[j][0]*x1 + wh[j][1]*x2 + bh[j]) for j in range(hidden_size)]
        return sigmoid(sum(wo[j]*h[j] for j in range(hidden_size)) + bo)
    return predict

for size, name in [(1, "1 hidden neuron  (too small)"), (4, "4 hidden neurons (works)")]:
    predict = train(size)
    print(name)
    correct = 0
    for (a, b), target in XOR:
        p = predict(a, b)
        got = 1 if p > 0.5 else 0
        correct += got == target
        print(f"   {a} XOR {b} -> {p:.3f}  rounds to {got}, wanted {target}")
    print(f"   {correct}/4 correct")
    print()`}
      />

      <h2 className="display">Overfitting, and why you hold data back</h2>
      <Overfitting />

      <div className="prose">
        <p>
          A model that scores perfectly on its training data has not necessarily
          learned anything. It may have <strong>memorised</strong> — including
          the noise, the flukes and the mistakes in your labels. That is{" "}
          <strong>overfitting</strong>, and it shows up as excellent training
          performance and poor performance on anything new.
        </p>
        <p>
          The opposite failure is <strong>underfitting</strong>: the model is too
          simple to capture the pattern, and does badly on everything.
        </p>
        <p>
          The defence is to split your data, and never to let the model see all
          of it:
        </p>
        <ul>
          <li>
            <strong>Training set</strong> — what the model learns from, usually
            most of the data.
          </li>
          <li>
            <strong>Validation set</strong> — used while developing, to compare
            settings and decide when to stop.
          </li>
          <li>
            <strong>Test set</strong> — locked away until the very end, and used
            once. The moment you tune anything based on the test set, it has
            stopped being a fair test.
          </li>
        </ul>
      </div>

      <h2 className="display">Measuring a model honestly</h2>
      <ConfusionMatrix />

      <div className="prose">
        <p>
          Accuracy is the fraction of predictions that were right, and on its
          own it can be badly misleading. Screen for a disease that one person
          in a thousand has, and a model that simply answers &ldquo;no&rdquo;
          every time is 99.9% accurate and completely useless.
        </p>
        <MB>
          {"\\text{precision} = \\frac{TP}{TP + FP} \\qquad \\text{recall} = \\frac{TP}{TP + FN}"}
        </MB>
        <p>
          <strong>Precision</strong> asks: when it said yes, how often was it
          right? <strong>Recall</strong> asks: of all the real cases, how many
          did it catch? They pull against each other. A cancer screen should
          favour recall, because a missed case is far worse than a false alarm
          that gets checked. A spam filter should favour precision, because
          losing a real email is worse than seeing one advert.
        </p>
      </div>

      <PyRunner
        caption="Why accuracy alone is not enough. Both models are evaluated on the same thousand patients."
        code={`# 1000 patients, 10 of whom actually have the disease.
actual = [1] * 10 + [0] * 990

lazy    = [0] * 1000                       # always says "no"
careful = [1]*8 + [0]*2 + [1]*30 + [0]*960  # catches 8, 30 false alarms

def report(name, predicted):
    tp = sum(1 for p, a in zip(predicted, actual) if p == 1 and a == 1)
    fp = sum(1 for p, a in zip(predicted, actual) if p == 1 and a == 0)
    fn = sum(1 for p, a in zip(predicted, actual) if p == 0 and a == 1)
    tn = sum(1 for p, a in zip(predicted, actual) if p == 0 and a == 0)

    accuracy  = (tp + tn) / len(actual)
    precision = tp / (tp + fp) if tp + fp else 0
    recall    = tp / (tp + fn) if tp + fn else 0

    print(f"{name}")
    print(f"   accuracy  {accuracy:6.1%}")
    print(f"   precision {precision:6.1%}   (when it said yes, was it right?)")
    print(f"   recall    {recall:6.1%}   (of the real cases, how many caught?)")
    print(f"   missed {fn} sick patients")
    print()

report("Model A - always says no", lazy)
report("Model B - cautious screen", careful)
print("Model A wins on accuracy and would kill people.")`}
      />

      <h2 className="display">Bias, fairness and consequences</h2>
      <div className="prose">
        <p>
          A model learns the patterns in its training data, including the ones
          nobody wanted it to learn. If historical hiring data reflects
          historical discrimination, a model trained on it will reproduce that
          discrimination — and will do so with an appearance of objectivity that
          makes it harder to challenge.
        </p>
        <ul>
          <li>
            <strong>Sampling bias.</strong> The training data does not represent
            the people the system will be used on. Facial recognition trained
            mostly on light-skinned faces performs measurably worse on others.
          </li>
          <li>
            <strong>Historical bias.</strong> The data faithfully records an
            unjust past, and the model treats it as the target.
          </li>
          <li>
            <strong>Labelling bias.</strong> The humans who produced the labels
            brought their own assumptions.
          </li>
          <li>
            <strong>Feedback loops.</strong> A model&apos;s predictions shape the
            world, which produces the next round of training data. Predictive
            policing sends officers to areas it flagged, which generates more
            recorded crime there, which confirms the flag.
          </li>
        </ul>
        <p>
          Two further concerns the syllabus expects you to raise.{" "}
          <strong>Explainability</strong>: a deep network cannot readily say why
          it refused your loan, which is a serious problem when a decision must
          be justified or appealed. <strong>Accountability</strong>: when an
          autonomous system causes harm, responsibility has to sit with someone
          — the developer, the deployer, or the organisation that chose to use
          it. &ldquo;The algorithm decided&rdquo; is not an answer.
        </p>
        <p>
          Machine learning also carries real costs: training large models
          consumes substantial energy, and the data behind them is frequently
          collected from people who never meaningfully agreed to it.
        </p>
      </div>

      <div className="callout">
        <div className="calloutHead">Applications worth knowing</div>
        <p style={{ margin: 0 }}>
          Medical image diagnosis, fraud detection, recommendation systems,
          speech and handwriting recognition, machine translation, autonomous
          vehicles, and weather forecasting. For each you should be able to say
          which type of learning it uses and what the cost of a wrong answer is
          — because that is what exam questions actually probe.
        </p>
      </div>

      <p className="annotation">
        <b>Exam note.</b> Questions about bias want mechanisms, not outrage.
        Name where the bias entered — the sample, the labels, the historical
        record, the feedback loop — say what harm follows, and give one concrete
        mitigation such as auditing the training set or holding out a
        representative test set.
      </p>
      <Practice
        items={[
          {
            marks: 4,
            q: <p>Distinguish between supervised and unsupervised learning, giving one application of each.</p>,
            a: (
              <p>Supervised learning trains on data that already carries the correct answers, so the model learns a mapping from inputs to known labels — for example classifying email as spam or not spam. Unsupervised learning has no labels and instead looks for structure in the data itself — for example clustering customers by buying habits when nobody knows in advance what the groups should be.</p>
            ),
          },
          {
            marks: 5,
            q: <p>Explain what overfitting is, how it is detected, and one way to reduce it.</p>,
            a: (
              <p>Overfitting is when a model learns the training data too closely, including its noise and quirks, instead of the underlying pattern. It is detected by holding data back: the model performs excellently on the training set and poorly on unseen test data. It can be reduced by training on more and more varied data, by simplifying the model so it has less capacity to memorise, or by stopping training earlier using a validation set.</p>
            ),
          },
          {
            marks: 5,
            q: <p>A screening model for a rare disease is 99% accurate. Explain why this figure may be misleading and name two better measures.</p>,
            a: (
              <p>If only one person in a hundred has the disease, a model that answers &ldquo;no&rdquo; to everybody is 99% accurate and catches nobody. Accuracy hides the difference between the two kinds of error. <strong>Recall</strong> asks what fraction of real cases were caught, which is what matters here because a missed diagnosis is severe. <strong>Precision</strong> asks how often a positive prediction was correct, which governs how many people are alarmed and tested unnecessarily.</p>
            ),
          },
          {
            marks: 6,
            q: <p>A recruitment company trains a model on ten years of its own hiring decisions. Discuss the ethical risks and one mitigation.</p>,
            a: (
              <>
                <p>The training data records past human decisions, including any discrimination in them. The model will learn those patterns as if they were the target and reproduce them at scale, while appearing objective — which makes the outcome harder to challenge than an individual biased decision.</p>
                <p>There is also an explainability problem: a candidate rejected by the model cannot easily be told why, which matters when a decision must be justified or appealed, and accountability must still rest with the company rather than with the algorithm.</p>
                <p>Mitigations include auditing the training data for imbalance, testing outcomes separately across protected groups rather than only overall accuracy, removing proxies for protected characteristics, and keeping a human decision-maker who can be held responsible.</p>
              </>
            ),
          },
        ]}
      />
    </>
  );
}
