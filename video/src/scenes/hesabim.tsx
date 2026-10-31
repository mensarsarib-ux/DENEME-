import {makeScene2D} from '@motion-canvas/2d/lib/scenes';
import {Rect, Txt} from '@motion-canvas/2d/lib/components';
import {createRef} from '@motion-canvas/core/lib/utils';
import {all, waitFor} from '@motion-canvas/core/lib/flow';

// Hesabım Muhasebe renk paleti
const BG = '#0B1420';
const TURQUOISE = '#7FE3EE';
const BLUE = '#3B82F6';
const RED = '#F87171';
const GREEN = '#34D399';
const TEXT = '#F1F5F9';
const MUTED = '#94A3B8';
const CARD = '#141E2E';
const TRACK = '#1E293B';

// Örnek veriler; gerçek müşteri verisi kullanılmaz
export default makeScene2D(function* (view) {
  view.fill(BG);

  const hook = createRef<Txt>();
  const brand = createRef<Txt>();
  const tagline = createRef<Txt>();
  const cashCard = createRef<Rect>();
  const cashAmount = createRef<Txt>();
  const incomeBar = createRef<Rect>();
  const expenseBar = createRef<Rect>();
  const debtCard = createRef<Rect>();
  const cta = createRef<Rect>();

  view.add(
    <>
      <Txt
        ref={hook}
        text="Hala deftere mi yazıyorsunuz?"
        fontFamily="Inter"
        fontSize={96}
        fontWeight={800}
        fill={TEXT}
        textAlign="center"
        width={900}
        opacity={0}
      />

      <Txt
        ref={brand}
        text="Hesabım Muhasebe"
        fontFamily="Inter"
        fontSize={92}
        fontWeight={800}
        fill={TURQUOISE}
        opacity={0}
        y={-260}
      />
      <Txt
        ref={tagline}
        text="Cari hesap, kasa ve ekibiniz tek uygulamada"
        fontFamily="Inter"
        fontSize={44}
        fill={MUTED}
        textAlign="center"
        width={880}
        opacity={0}
        y={-150}
      />

      <Rect
        ref={cashCard}
        width={900}
        height={320}
        radius={40}
        fill={CARD}
        padding={48}
        y={-10}
        opacity={0}
        layout
        direction="column"
        gap={16}
        alignItems="start"
      >
        <Txt text="KASA TOPLAMI" fontFamily="Inter" fontSize={32} fontWeight={600} fill={MUTED} />
        <Txt ref={cashAmount} text="₺1.015.600,00" fontFamily="Inter" fontSize={84} fontWeight={800} fill={GREEN} />
      </Rect>

      <Rect width={900} height={24} radius={12} fill={TRACK} y={230}>
        <Rect ref={incomeBar} width={0} height={24} radius={12} fill={BLUE} x={-450} offsetX={-1} />
      </Rect>
      <Rect width={900} height={24} radius={12} fill={TRACK} y={300}>
        <Rect ref={expenseBar} width={0} height={24} radius={12} fill={RED} x={-450} offsetX={-1} />
      </Rect>

      <Rect
        ref={debtCard}
        width={900}
        height={200}
        radius={40}
        fill={CARD}
        padding={44}
        y={520}
        opacity={0}
        layout
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Txt text="Akdeniz Gıda Ltd." fontFamily="Inter" fontSize={44} fill={TEXT} />
        <Txt text="₺133.500,00" fontFamily="Inter" fontSize={48} fontWeight={700} fill={BLUE} />
      </Rect>

      <Rect
        ref={cta}
        width={820}
        height={130}
        radius={65}
        fill={GREEN}
        y={760}
        opacity={0}
        layout
        justifyContent="center"
        alignItems="center"
      >
        <Txt text="Hemen deneyin" fontFamily="Inter" fontSize={52} fontWeight={800} fill={BG} />
      </Rect>
    </>,
  );

  // Seslendirme metni: her adım ElevenLabs sesine göre süreyle eşleştirilir
  yield* hook().opacity(1, 0.6);
  yield* waitFor(2.4);
  yield* hook().opacity(0, 0.5);

  yield* all(brand().opacity(1, 0.6), brand().y(-220, 0.6), tagline().opacity(1, 0.8));
  yield* waitFor(2);
  yield* all(brand().opacity(0, 0.4), tagline().opacity(0, 0.4));

  yield* cashCard().opacity(1, 0.6);
  yield* waitFor(1);

  yield* all(incomeBar().width(780, 1.2), expenseBar().width(220, 1.2));
  yield* waitFor(1.5);
  yield* cashCard().opacity(0, 0.4);

  yield* debtCard().opacity(1, 0.6);
  yield* waitFor(3);

  yield* cta().opacity(1, 0.6);
  yield* waitFor(3);
});
