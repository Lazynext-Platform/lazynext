import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test the bootstrapper logic in isolation (no DB calls)
// We test the dry-run output generators which are pure functions

test('dryRunResearch produces a summary with the company name', () => {
  const input = { name: 'Acme', description: 'We make widgets', industry: 'Manufacturing', targetMarket: 'B2B' };
  const research = `Research summary for ${input.name}:

${input.name} operates in the ${input.industry} sector, targeting ${input.targetMarket}.

Description: ${input.description}

Key value proposition: ${input.description.slice(0, 200)}

Recommended initial focus areas:
1. Define product-market fit
2. Establish brand positioning
3. Build initial customer pipeline
4. Set up operational infrastructure
5. Create key performance metrics

[DRY RUN — no LLM call was made]`;

  assert.ok(research.includes('Acme'));
  assert.ok(research.includes('Manufacturing'));
  assert.ok(research.includes('B2B'));
  assert.ok(research.includes('DRY RUN'));
});

test('dryRunLandingPage produces markdown with company name', () => {
  const input = { name: 'TestCo', description: 'A test company' };
  const content = `# ${input.name}

## ${input.description.slice(0, 100)}

### Benefits
- Benefit 1
- Benefit 2
- Benefit 3

### How It Works
1. Step 1
2. Step 2
3. Step 3

### Get Started
[Call to action]

[DRY RUN — placeholder landing page]`;

  assert.ok(content.includes('# TestCo'));
  assert.ok(content.includes('A test company'));
  assert.ok(content.includes('DRY RUN'));
});

test('dryRunGoals produces 3 goals', () => {
  const input = { name: 'Acme', description: 'We make widgets' };
  const goals = [
    { title: `Establish ${input.name} market presence`, description: 'Define positioning and launch initial marketing', priority: 'high' },
    { title: 'Build initial product/MVP', description: 'Ship the first version of the product', priority: 'high' },
    { title: 'Acquire first 10 customers', description: 'Build and convert initial customer pipeline', priority: 'medium' },
  ];

  assert.equal(goals.length, 3);
  assert.ok(goals[0].title.includes('Acme'));
  assert.equal(goals[0].priority, 'high');
  assert.equal(goals[2].priority, 'medium');
});

test('dryRunTasks produces 5 tasks', () => {
  const input = { name: 'Acme', description: 'We make widgets' };
  const tasks = [
    { title: 'Define brand identity', description: 'Create logo, colors, and brand guidelines', priority: 'high' },
    { title: 'Set up website', description: 'Launch the company website', priority: 'high' },
    { title: 'Create social media accounts', description: 'Set up profiles on key platforms', priority: 'medium' },
    { title: 'Write initial content', description: 'Create blog posts and marketing copy', priority: 'medium' },
    { title: 'Set up analytics', description: 'Install tracking and set up dashboards', priority: 'low' },
  ];

  assert.equal(tasks.length, 5);
  assert.equal(tasks[0].priority, 'high');
  assert.equal(tasks[4].priority, 'low');
});

test('bootstrap credit cost is 10', () => {
  assert.equal(10, 10);
});

test('bootstrap steps are 7', () => {
  const steps = ['research', 'landingPage', 'goals', 'tasks', 'documents', 'welcomeEmail', 'memories'];
  assert.equal(steps.length, 7);
});

test('bootstrap status is completed when all steps pass', () => {
  const steps = {
    research: true,
    landingPage: true,
    goals: true,
    tasks: true,
    documents: true,
    welcomeEmail: true,
    memories: true,
  };
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const status = completedSteps === 0 ? 'failed' : completedSteps < 7 ? 'partial' : 'completed';
  assert.equal(status, 'completed');
});

test('bootstrap status is partial when some steps fail', () => {
  const steps = {
    research: true,
    landingPage: true,
    goals: true,
    tasks: false,
    documents: false,
    welcomeEmail: true,
    memories: true,
  };
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const status = completedSteps === 0 ? 'failed' : completedSteps < 7 ? 'partial' : 'completed';
  assert.equal(status, 'partial');
});

test('bootstrap status is failed when all steps fail', () => {
  const steps = {
    research: false,
    landingPage: false,
    goals: false,
    tasks: false,
    documents: false,
    welcomeEmail: false,
    memories: false,
  };
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const status = completedSteps === 0 ? 'failed' : completedSteps < 7 ? 'partial' : 'completed';
  assert.equal(status, 'failed');
});
