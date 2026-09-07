/**
 * Generators: turn a sub-vertical record into product pages and knowledge articles.
 * Output is plain JSON that the CMS/admin can edit afterwards; the build never calls these.
 */
const TYPE = {
  'inbound-calls': {
    name: 'Inbound Calls',
    singular: 'inbound call',
    plural: 'inbound calls',
    process: (sv) => [
      { title: 'PPC / Traffic Acquisition', text: `Performance campaigns across search, social and comparison placements reach consumers actively looking for ${sv.name.toLowerCase()} solutions.` },
      { title: 'Consumer Interest', text: `The consumer sees a relevant ${sv.name.toLowerCase()} offer with a prominent phone number and a clear reason to call.` },
      { title: 'Call Initiated', text: 'The consumer dials directly from the ad or landing page. Nobody is cold-called; the consumer chooses to reach out.' },
      { title: 'Qualification', text: 'Optional IVR prompts and duration thresholds screen out wrong numbers, non-prospects and out-of-area callers.' },
      { title: 'Inbound Call Delivered', text: 'The call rings your team in real time, routed by geography, schedule and agent availability.' },
    ],
    benefits: (sv) => [
      { title: 'High-intent consumers', text: `Callers have chosen to pick up the phone about ${sv.name.toLowerCase()}, the clearest signal of purchase intent available.` },
      { title: 'Real-time opportunities', text: 'Calls connect the moment the consumer dials, while the need is active and the decision is being made.' },
      { title: 'Industry targeting', text: `Campaigns, creative and qualification are built specifically for the ${sv.name.toLowerCase()} market, not adapted from a generic template.` },
      { title: 'Faster customer acquisition', text: 'A live conversation compresses the sales cycle from days of follow-up into a single call.' },
      { title: 'Qualified consumer engagement', text: 'IVR and duration filters mean your agents spend time with consumers who match your criteria.' },
      { title: 'Full visibility', text: 'Every call is tracked to its source with recording and reporting available for quality review.' },
    ],
    titles: (sv) => [
      { key: 'intent', title: `Understanding ${sv.name} Call Intent`, slug: `understanding-${sv.slug}-call-intent` },
      { key: 'acquisition', title: `How ${sv.name} Inbound Calls Support Customer Acquisition`, slug: `how-${sv.slug}-inbound-calls-support-customer-acquisition` },
    ],
    cta: 'Request More Information',
  },
  'live-transfers': {
    name: 'Live Transfers',
    singular: 'live transfer',
    plural: 'live transfers',
    process: (sv) => [
      { title: 'Traffic Acquisition', text: `Performance campaigns generate ${sv.name.toLowerCase()} consumers with active interest across search, social and comparison channels.` },
      { title: 'Consumer Interest', text: 'The consumer responds to a relevant offer and engages with our qualification team.' },
      { title: 'Qualification', text: `Our team confirms the consumer meets your ${sv.name.toLowerCase()} criteria and verifies key details where required.` },
      { title: 'Live Connection', text: 'With the consumer still on the line, our agent bridges the call to your designated destination.' },
      { title: 'Transfer to Client', text: 'Your agent takes over a warm, expecting consumer who has already confirmed interest and eligibility.' },
    ],
    benefits: (sv) => [
      { title: 'Pre-qualified consumers', text: `Every transfer has been screened against your ${sv.name.toLowerCase()} criteria before your agent says hello.` },
      { title: 'Real-time opportunities', text: 'Transfers happen immediately after qualification, so intent never has time to cool.' },
      { title: 'Industry targeting', text: `Scripts and criteria are written specifically for ${sv.name.toLowerCase()} consumers and buyers.` },
      { title: 'Faster customer acquisition', text: 'Your team skips discovery and starts the conversation at the point of decision.' },
      { title: 'Agent efficiency', text: 'No dialling, no voicemail, no wrong numbers. Agent time goes to consumers who can convert.' },
      { title: 'Controlled volume', text: 'Daily caps, schedules and pause controls keep delivery aligned to your capacity.' },
    ],
    titles: (sv) => [
      { key: 'intent', title: `Understanding ${sv.name} Customer Intent`, slug: `understanding-${sv.slug}-customer-intent` },
      { key: 'acquisition', title: `How Live Transfers Can Support ${sv.name} Customer Acquisition`, slug: `how-live-transfers-can-support-${sv.slug}-customer-acquisition` },
    ],
    cta: 'Talk to Our Team',
  },
};

const lower = (s) => s.toLowerCase();

export function productFor(vertical, sv, type) {
  const t = TYPE[type];
  const angle = type === 'inbound-calls' ? sv.inboundCallsAngle : sv.liveTransfersAngle;
  const name = `${sv.name} ${t.name}`;
  return {
    slug: type,
    type,
    vertical: vertical.slug,
    subVertical: sv.slug,
    name,
    active: true,
    hero: {
      headline: name,
      subheadline: `Connect with high-intent consumers actively looking for ${lower(sv.name)} solutions.`,
      cta: t.cta,
    },
    overview: [
      `${name} are ${type === 'inbound-calls' ? 'consumers who see an offer and dial in themselves' : 'consumers qualified by our team and warm-transferred to your agents'}, generated by Altarious Global performance campaigns and delivered to your business in real time. ${sv.shortDescription}`,
      angle,
      `This product is suited to ${lower(vertical.name)} businesses with a team ready to answer during defined hours, a clear view of the consumer they want, and the capacity to convert a live conversation. The acquisition objective is simple: put your team in front of ${lower(sv.name)} consumers at the moment they are deciding.`,
    ],
    targetConsumer: sv.consumerProfile,
    consumerIntent: `Typical intent signals include: ${sv.intentSignals.slice(0, 4).map(lower).join('; ')}.`,
    howGenerated:
      type === 'inbound-calls'
        ? `Calls are generated through call-only and click-to-call performance campaigns targeting searches such as "${sv.keywords[0]}" and "${sv.keywords[1]}", alongside social and comparison placements. Every source is tracked, so call quality can be traced back to the campaign that produced it.`
        : `Consumers are acquired through performance campaigns targeting searches such as "${sv.keywords[0]}" and "${sv.keywords[1]}", plus social and comparison placements. Interested consumers speak with our qualification team before any transfer is attempted.`,
    qualification: `Qualification is configured to your appetite. Standard ${lower(sv.name)} criteria include: ${sv.qualificationCriteria.map(lower).join('; ')}.`,
    delivery:
      type === 'inbound-calls'
        ? 'Calls are routed to your sales line in real time by state or ZIP, schedule and agent availability, with concurrency limits and daily caps set to your capacity. Call tracking and recording are available for quality control.'
        : 'Once qualified, the consumer is bridged directly to your designated number or queue with a warm introduction. Delivery runs only during your operating hours with daily caps, and you can pause or adjust criteria at any time.',
    process: t.process(sv),
    benefits: t.benefits(sv),
    whyUs: [
      `Dedicated ${lower(sv.name)} program design, not a generic template`,
      'Real-time delivery matched to your hours and capacity',
      'Transparent source tracking and reporting',
      'Compliance-aware traffic and consent documentation',
    ],
    faq: sv.faq,
    cta: {
      headline: `Interested in ${name}?`,
      text: `Tell us the states you cover, your qualification criteria and the volume you need. We will scope a ${lower(sv.name)} ${t.singular} program for your team.`,
      button: t.cta,
    },
    seo: {
      title: `${name} | ${vertical.name} ${t.name}`,
      description: `${name} from Altarious Global: high-intent ${lower(sv.name)} consumers ${type === 'inbound-calls' ? 'calling in real time' : 'qualified and warm-transferred'} to your team. ${sv.shortDescription}`,
    },
  };
}

export function articlesFor(vertical, sv, type) {
  const t = TYPE[type];
  const productUrl = `/${vertical.slug}/${sv.slug}/${type}/`;
  const subUrl = `/${vertical.slug}/${sv.slug}/`;
  const vUrl = `/${vertical.slug}/`;
  const [intent, acquisition] = t.titles(sv);
  const date = '2026-09-05';
  const common = {
    vertical: vertical.slug,
    subVertical: sv.slug,
    product: type,
    author: 'Altarious Global Research',
    publishedAt: date,
  };
  return [
    {
      slug: intent.slug,
      title: intent.title,
      ...common,
      excerpt: `What drives a ${lower(sv.name)} consumer to ${type === 'inbound-calls' ? 'pick up the phone' : 'ask to be connected'}, the signals that separate real intent from research, and how to qualify it.`,
      body: intentBody(vertical, sv, type, { productUrl, subUrl, vUrl }),
      seo: {
        title: intent.title,
        description: `A practical guide to ${lower(sv.name)} ${type === 'inbound-calls' ? 'call' : 'customer'} intent: the triggers, the signals and the qualification criteria that matter for ${lower(t.plural)}.`,
        keywords: sv.keywords.slice(0, 4),
      },
    },
    {
      slug: acquisition.slug,
      title: acquisition.title,
      ...common,
      excerpt: `How ${lower(sv.name)} ${t.plural} fit into a customer acquisition strategy, what the delivery process looks like, and how to measure results.`,
      body: acquisitionBody(vertical, sv, type, { productUrl, subUrl, vUrl }),
      seo: {
        title: acquisition.title,
        description: `How ${lower(sv.name)} businesses use ${t.plural} to acquire customers: process, qualification, delivery and measurement.`,
        keywords: [...sv.keywords.slice(0, 2), `${lower(sv.name)} ${t.plural}`, `${lower(sv.name)} leads`],
      },
    },
  ];
}

function intentBody(vertical, sv, type, u) {
  const t = TYPE[type];
  const n = lower(sv.name);
  const list = (arr) => arr.map((x) => `- ${x}`).join('\n');
  return `${sv.marketContext}

Understanding why a ${n} consumer reaches out is the foundation of any effective ${t.singular} program. This article breaks down the triggers behind ${n} intent, the signals that separate a ready buyer from a casual researcher, and the qualification criteria buyers in the [${vertical.name}](${u.vUrl}) vertical typically apply.

## Who the ${n} consumer is

${sv.consumerProfile}

Because this profile is specific, the campaigns that reach it must be specific too. Generic ${lower(vertical.name)} messaging attracts a broad, low-converting audience. Messaging built around the exact situation of a ${n} consumer attracts people who need a solution now.

## The triggers behind ${n} intent

Intent rarely appears from nowhere. It is triggered by a change in the consumer's circumstances. The most common ${n} triggers we see across campaigns are:

${list(sv.intentSignals)}

Each of these moments opens a window in which the consumer is actively comparing options and willing to ${type === 'inbound-calls' ? 'talk to a provider' : 'be connected to a provider'}. The window is often short, which is why real-time delivery matters so much in this category.

## Separating intent from research

Not every search is a buying signal. Consumers researching "${sv.keywords[0]}" may be early in their journey, while someone searching "${sv.keywords[Math.min(2, sv.keywords.length - 1)]}" is usually much closer to a decision. ${type === 'inbound-calls' ? 'An inbound call is itself a strong filter: the consumer has decided that the fastest route to a solution is a conversation.' : 'A live transfer program adds a human filter: our team speaks with the consumer and confirms the need is real before any connection is made.'}

### Signals of high intent

- Urgency language such as "today", "now" or "near me"
- Specific product or situation terms rather than general category terms
- Engagement with a phone number or request-a-quote element
- A recent triggering event confirmed in conversation

### Signals of low intent

- Purely informational queries with no product or location modifier
- Consumers outside your service geography or licensing footprint
- Requests that fall outside the product you actually offer

## Qualifying ${n} consumers

Buyers in this market typically screen for the following before accepting a ${t.singular}:

${list(sv.qualificationCriteria)}

${type === 'inbound-calls' ? `In an inbound call program these criteria are applied through campaign targeting, IVR prompts and duration thresholds, so that the calls reaching your agents are already filtered for geography and basic fit.` : `In a live transfer program our qualification team confirms each criterion with the consumer before the transfer, so your agents receive only consumers who match.`}

## Why this matters for your acquisition program

When intent is understood and qualification is built around it, three things happen. Conversion rates rise because agents talk to consumers who are ready. Cost per acquisition falls because budget is not spent on researchers and out-of-footprint consumers. And the program becomes scalable, because the same intent model can be applied to new states, new segments and new channels.

## Next steps

${sv.inboundCallsAngle && type === 'inbound-calls' ? sv.inboundCallsAngle : sv.liveTransfersAngle}

Explore the [${sv.name} ${t.name}](${u.productUrl}) product page for details on how the program is generated, qualified and delivered, or return to the [${sv.name}](${u.subUrl}) overview to compare products.`;
}

function acquisitionBody(vertical, sv, type, u) {
  const t = TYPE[type];
  const n = lower(sv.name);
  const steps = t.process(sv).map((s, i) => `${i + 1}. **${s.title}.** ${s.text}`).join('\n');
  const other = type === 'inbound-calls' ? 'live-transfers' : 'inbound-calls';
  const otherName = TYPE[other].name;
  return `For ${n} businesses, the cost of acquiring a customer is driven by two things: how many conversations it takes to close, and how much it costs to start each one. ${sv.name} ${t.plural} attack both. This article explains how ${t.plural} fit into a ${n} acquisition strategy, what the process looks like end to end, and how to measure whether the program is working.

## Where ${t.plural} fit in the acquisition mix

${type === 'inbound-calls' ? sv.inboundCallsAngle : sv.liveTransfersAngle}

Most ${n} businesses run some combination of referrals, organic search, paid media and purchased leads. ${t.name} sit at the high-intent end of that spectrum. ${type === 'inbound-calls' ? 'The consumer initiates the contact, which means there is no chase, no voicemail and no waiting for a callback.' : 'The consumer has been spoken to, qualified and handed over while still engaged, which means your agent starts at the point of decision.'} That makes them particularly valuable for teams with limited agent capacity that need every conversation to count.

## How the process works

${steps}

Each stage is configurable. Geography, schedule, qualification criteria and daily caps are set to your operation, and adjusted as results come in. Learn more on the [${sv.name} ${t.name}](${u.productUrl}) product page.

## Qualification in practice

The criteria that matter for ${n} programs usually include:

${sv.qualificationCriteria.map((x) => `- ${x}`).join('\n')}

${type === 'inbound-calls' ? 'For inbound calls, these are enforced through targeting and IVR logic before the call is connected, and through duration thresholds that determine which calls count.' : 'For live transfers, our qualification team asks these questions directly and only transfers consumers who confirm eligibility. Verification steps can be added where the vertical requires them.'} The result is that your agents are not spending time on consumers who could never become customers.

## Delivery and integration

${type === 'inbound-calls' ? 'Calls are routed in real time to the number or queue you designate. Routing can be split by state or ZIP, by time of day and by agent availability, with concurrency limits so your team is never overwhelmed. Call tracking provides source, duration and recording for every call.' : 'Transfers are bridged to your designated number or queue with a warm introduction from our agent. Delivery runs only during your operating hours, with daily caps and a pause control you manage. Every transfer is logged with its source and qualification details.'} Programs can run alongside web leads and ${otherName.toLowerCase()} from the same campaign infrastructure, giving you a single reporting view.

## Measuring success

A ${n} ${t.singular} program should be judged on outcomes, not volume. The metrics that matter most are:

- **Contact-to-conversation rate.** The share of delivered ${t.plural} that become a substantive sales conversation.
- **Conversion rate.** Conversations that become a policy, a booked job, a funded loan or a signed client, depending on your business.
- **Cost per acquisition.** Total program cost divided by customers won.
- **Speed to conversion.** How quickly a delivered consumer becomes a customer compared with other channels.

Because every ${t.singular} is tracked to its source, underperforming campaigns can be adjusted or paused quickly, and the sources that produce customers can be scaled.

## Getting started

${sv.marketContext}

If your team is ready to take ${n} ${t.plural}, the next step is a short scoping conversation about your geography, criteria and capacity. Visit the [${sv.name} ${t.name}](${u.productUrl}) product page, compare it with [${sv.name} ${otherName}](/${vertical.slug}/${sv.slug}/${other}/), or explore the wider [${vertical.name}](${u.vUrl}) vertical.`;
}
