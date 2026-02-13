<template>
  <div ref="container" v-html="svgContent" class="qr-code-container"></div>
</template>

<script>
import { ref, watch, onMounted, defineComponent } from 'vue';
import { generate } from '@stone-pixel/qr-core/src/qr-core.js';
import { toStyledSVG } from '@stone-pixel/qr-core/src/qr-styled.js';

export default defineComponent({
  name: 'QRCode',

  props: {
    value: {
      type: String,
      required: true,
    },
    ecLevel: {
      type: String,
      default: 'M',
      validator: (v) => ['L', 'M', 'Q', 'H'].includes(v),
    },
    margin: {
      type: Number,
      default: 4,
    },
    dotShape: {
      type: String,
      default: 'square',
    },
    cornerSquareShape: {
      type: String,
      default: 'square',
    },
    cornerDotShape: {
      type: String,
      default: 'square',
    },
    dotColor: {
      type: String,
      default: '#000000',
    },
    cornerSquareColor: {
      type: String,
      default: null,
    },
    cornerDotColor: {
      type: String,
      default: null,
    },
    backgroundColor: {
      type: String,
      default: '#ffffff',
    },
    gradientType: {
      type: String,
      default: null,
    },
    gradientColors: {
      type: Array,
      default: null,
    },
    gradientRotation: {
      type: Number,
      default: 0,
    },
    centerImage: {
      type: String,
      default: null,
    },
    centerImageSize: {
      type: Number,
      default: 0.25,
    },
    centerImageMargin: {
      type: Number,
      default: 4,
    },
  },

  setup(props) {
    const svgContent = ref('');
    const container = ref(null);

    function renderQR() {
      if (!props.value) {
        svgContent.value = '';
        return;
      }

      try {
        const ecLevel = props.centerImage ? 'H' : props.ecLevel;
        const qr = generate(props.value, { ecLevel });

        svgContent.value = toStyledSVG(qr, {
          margin: props.margin,
          dotShape: props.dotShape,
          cornerSquareShape: props.cornerSquareShape,
          cornerDotShape: props.cornerDotShape,
          dotColor: props.dotColor,
          cornerSquareColor: props.cornerSquareColor,
          cornerDotColor: props.cornerDotColor,
          backgroundColor: props.backgroundColor,
          gradientType: props.gradientType,
          gradientColors: props.gradientColors,
          gradientRotation: props.gradientRotation,
          centerImage: props.centerImage,
          centerImageSize: props.centerImageSize,
          centerImageMargin: props.centerImageMargin,
        });
      } catch (err) {
        svgContent.value = '';
        console.error('QR Code generation error:', err);
      }
    }

    onMounted(renderQR);

    watch(
      () => [
        props.value, props.ecLevel, props.margin,
        props.dotShape, props.cornerSquareShape, props.cornerDotShape,
        props.dotColor, props.cornerSquareColor, props.cornerDotColor,
        props.backgroundColor,
        props.gradientType, props.gradientColors, props.gradientRotation,
        props.centerImage, props.centerImageSize, props.centerImageMargin,
      ],
      renderQR,
      { deep: true }
    );

    return { svgContent, container };
  },
});
</script>

<style scoped>
.qr-code-container {
  display: inline-block;
  line-height: 0;
}

.qr-code-container :deep(svg) {
  max-width: 100%;
  height: auto;
}
</style>
