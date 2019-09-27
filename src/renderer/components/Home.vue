<template>
  <div>
    <div v-if="!qrcodeUrl">
      <el-alert
        title="如何打印?"
        type="info"
        description="使用 Office 打开您的文档，依次打印，最后在这里结算。"
        :closable="false"
      >
      </el-alert>

      <h4>
        您的待印文档
      </h4>

      <div v-if="jobs.length">
        <p>
          <small>
            共 {{totalPage}} 页，需支付 {{totalPrice}} 元。
          </small>
        </p>

        <ul>
          <li
            v-for="item in jobs"
            :key="item.name"
            :type="item.type"
          >
            {{ item.document }} ({{ item.pages }} 页，{{ item.copies }} 份)
          </li>
        </ul>

        <div class="mt-10">
          <el-button size="small" type="danger" @click="clear">清空</el-button>
          <el-button size="small" type="primary" @click="submit">立即支付</el-button>
        </div>
      </div>
      <div v-else>
        <small>您还没有打印任何文档</small>
      </div>

    </div>
    <div v-else style="text-align: center;">
      <h4>扫码支付</h4>
      <p>
        微信扫码，支付后将立即开始打印。<br>
        <small>订单将在 {{countdown}} 秒后关闭。</small>
      </p>
      <img :src="qrcodeUrl" style="width: 70%;">
      <div class="mt-10">
        <el-button size="small" type="danger" @click="cancel">取消订单</el-button>
      </div>
    </div>

    <div style="color: #ccc; position: fixed; bottom: 3px; right: 8px;">
      <small>
        当前版本: {{$electron.remote.app.getVersion()}}
      </small>
    </div>

  </div>
</template>

<script>
  import axios from 'axios'
  import delay from 'delay'
  import printer from '../printer'

  export default {
    computed: {
      totalPage () {
        return this.jobs.reduce((sum, job) => sum + Number.parseInt(job.pages * job.copies), 0)
      },
      totalPrice () {
        return (this.totalPage * 0.1).toFixed(2)
      }
    },
    data() {
      return {
        jobs: [],
        qrcodeUrl: '',
        countdown: 0,
        jobTimer: null
      }
    },
    methods: {
      async clear () {
        this.qrcodeUrl = ''
        printer.removeAllPrintJobs()
      },
      cancel () {
        this.qrcodeUrl = ''
        this.countdown = 0
      },
      async submit () {
        const loading = this.$loading({
          lock: true,
          text: '生成订单',
          spinner: 'el-icon-loading',
          background: 'rgba(255, 255, 255, 0.7)'
        })

        await this.updateJobs()

        if (this.totalPage === 0) {
          loading.close()
          return
        }

        try {
          const res = await axios.post('http://bj.zexi.me:53000/order', {
            machineName: 'gj1',
            totalPage: this.totalPage
          })
          this.qrcodeUrl = res.data.qrcodeUrl

          this.countdown = 300
          setTimeout(() => this.checkIsPaid(res.data._id), 1000)
        } catch (err) {
          console.log(err)
          alert('网络连接错误，请重试！')
        }

        loading.close()
      },
      async checkIsPaid (orderId) {
        console.log(this.countdown)
        if (--this.countdown <= 0) {
          this.cancel()
          return
        }

        const res = await axios.get(`http://bj.zexi.me:53000/order/${orderId}`)
        if (res.data.state !== 'paid') {
          setTimeout(() => this.checkIsPaid(orderId), 1000)
          return
        }

        this.qrcodeUrl = ''
        const loading = this.$loading({
          lock: true,
          text: '打印文档',
          spinner: 'el-icon-loading',
          background: 'rgba(255, 255, 255, 0.7)'
        })
        await printer.resumePrinter()
        do {
          await delay(1 * 1000)
        } while (this.jobs.length)
        await printer.pausePrinter()
        loading.close()
      },
      async updateJobs () {
        this.jobs = await printer.getPrintJobs()
      }
    },
    async mounted () {
      const res = await printer.pausePrinter()

      this.jobTimer = setInterval(async () => {
        await this.updateJobs()
        console.log(this.jobs)
      }, 3000)
      await this.updateJobs()
    },
    beforeDestory () {
      clearInterval(this.jobTimer)
      this.jobTimer = null
    }
  }
</script>

<style scoped>
.mt-10 {
  margin-top: 10px;
}
</style>
