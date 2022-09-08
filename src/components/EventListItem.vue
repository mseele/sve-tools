<template>
  <div class="d-flex align-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="16pt" height="21.333">
      <path
        d="M15.625 10a5.625 5.625 0 11-11.25 0 5.625 5.625 0 0111.25 0z"
        :fill="color"
      />
    </svg>
    <div class="ml-2">{{ text }}</div>
  </div>
</template>

<script>
export default {
  props: {
    status: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  computed: {
    color() {
      switch (this.status) {
        case 'Draft':
          return '#DC2626'
        case 'Review':
          return '#FBBF24'
        case 'Published':
          return '#65A30D'
        case 'Finished':
          return '#7C3AED'
        case 'Closed':
          return '#52525B'
      }
    },
  },
}
</script>
