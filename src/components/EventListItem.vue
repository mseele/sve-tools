<template>
  <div class="d-flex align-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
      <path
        d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
        :fill="visible ? (beta ? '#FBBF24' : '#65A30D') : '#DC2626'"
      />
    </svg>
    <div class="ml-2">{{ text }}</div>
  </div>
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    beta: {
      type: Boolean,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
}
</script>
