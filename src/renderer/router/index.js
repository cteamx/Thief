import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/so',
      name: 'so',
      component: require('@/components/so').default
    },
    {
      path: '/setting',
      name: 'setting',
      component: require('@/components/setting').default
    },
    {
      path: '/desktop',
      name: 'desktop',
      component: require('@/components/desktop').default
    }
  ]
})
