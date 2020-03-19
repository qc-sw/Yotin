// pages/records/records.js
const innerAudioContext = wx.createInnerAudioContext()
//const AudioManager = wx.getBackgroundAudioManager()
const app = getApp();
const db = wx.cloud.database();
const _ = db.command

Page({

  /**
   * 页面的初始数据
   */
  data: {

    UsersRecords: [],
    UsersRecords_backup: [],
    startX: 0, //开始坐标
    startY: 0,
    currentTaptab: 0,
    tabContent: [],
    ShowInputmodal: false,
    Input_NewType: null,
    currentTime: null,
    duration: null,
    temIndex: null
  },


  //tem
  tem1() {
    db.collection("TabContent").get({
      success: function (res) {
        console.log("获取TabContent记录成功", res)
        //没有记录，新建
        if (res.data.length == 0) {
          console.log("没有已建立的获取TabContent记录,开始新建")
          db.collection("TabContent").add({
            data: {
              type: ["所有"]
            },
            success: function (res) {
              console.log("次要记录新建成功", res)
            }
          })

        }
      },
      fail: function (res) {
        console.log("Get TabContent fail", res)
      }
    })
  },

  //【创建新类别的功能】
  //弹出新类别输入框
  ShowInputmodal: function () {
    this.setData({
      ShowInputmodal: true
    })
  },
  //取消创建新标签
  Inputmodal_Cancel: function () {
    this.setData({
      ShowInputmodal: false
    })
  },
  //创建新的标签（Taptab）
  createNewTab: function () {
    var thispage = this;
    thispage.setData({
      ShowInputmodal: false
    })
    //在集合TabContent 修改记录
    let promise = db.collection('TabContent').where({
      _openid: app.globalData.openid
    }).get();
    //resolve(res.data[0]._id);
    promise.then(function (res) {
      console.log("寻找到了对应的TabContent记录", res)
      let p = db.collection('TabContent').doc(res.data[0]._id).update({
        data: {
          type: _.push([thispage.data.Input_NewType])
        }
      })
      p.then(function (res) {
        console.log("已修改对应的TabContent记录", res)
        //接着是同步,只同步tabList（TabContent）就好
        thispage.refTaptab();
      })
    });
  },
  //刷新标签的函数
  refTaptab: function () {
    var thispage = this;
    db.collection("TabContent").get({
    }).then(function (res) {
      console.log("刷新标签数据", res)
      thispage.setData({
        tabContent: res.data[0].type
      })
    })
  },
  //获得输入框的输入的事件(不需要提交到渲染层)
  getinput: function (e) {
    //console.log(e)
    this.data.Input_NewType = e.detail.value
  },


  // swiper滑动时触发bindchange事件，获取事件对象e获取当前所在滑块的 index，并将其更新至data的currentTab中，视图渲染通过判断currentTab的让对应的tab hover。
  GetCurrentTaptab: function (e) {
    console.log(e.detail.current);
    var that = this;
    this.setData({
      currentTab: e.detail.current
    });
    // console.log("11111"+this.data.currentTab);
  },
  //改变样式、筛选数组
  ChangeTaptab: function (e) {
    console.log("ChangeTaptab lauched.")
    var thispage = this;
    var current = e.target.dataset.current;
    var UsersRecords = thispage.data.UsersRecords_backup;
    var tabContent = thispage.data.tabContent;

    //console.log("tabContent[index]:", tabContent[current])
    UsersRecords.forEach(function (value, index, arrSelf) {
      if (value.type == tabContent[current] || tabContent[current] == '所有')
        value.isHide = false
      else if (value.type != tabContent[current])
        value.isHide = true
    })

    thispage.setData({
      currentTaptab: current,
      UsersRecords: UsersRecords
    })
  },



  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var thispage = this;
    //初始化
    //刷新标签数据、申请UsersRecords数据、向UsersRecords数组添加状态数据(Onshow)
    thispage.refTaptab();


    //音乐播放时，实时更新slider的value
    innerAudioContext.onTimeUpdate(() => {
      innerAudioContext.currentTime;
      innerAudioContext.duration;
      console.log("onTimeUpdate: duration:", innerAudioContext.duration)
      thispage.setData({
        currentTime: innerAudioContext.currentTime,
        duration: innerAudioContext.duration
      })
    })

    //自然播放结束：变换图标
    innerAudioContext.onEnded(() => {
      var index = this.data.temIndex
      this.setData({
        ["UsersRecords[" + index + "].isPlay"]: false,
        currentTime:0
      })
    })
    innerAudioContext.onPlay(() => {
      var index = this.data.temIndex
      this.setData({
        ["UsersRecords[" + index + "].isPlay"]: true
      })
    })

  },
  //向数据库申请 UsersRecords
  downDatabase: function () {
    var thispage = this;

    var promise = db.collection("UsersRecords").get()
      .then(function (res) {
        var p = new Promise(function (resolve, reject) {
          console.log("申请数据", res)
          thispage.setData({
            UsersRecords: res.data,
            UsersRecords_backup:res.data
          })
          resolve()
        })
        return p;
      }).then(function (res) {
        var p = new Promise(function (resolve, reject) {
          thispage.UStateInit();
          resolve()
        })
        return p;
      })

  },

  UStateInit: function () {
    var thispage = this;
    console.log("重置状态属性")
    var p = new Promise(function (resolve, reject) {
      thispage.data.UsersRecords.forEach(function (value, index, arrSelf) {
        //console.log("UsersRecords[",index,"]",value)
        thispage.setData({
          ["value.isTouchMove"]: false,
          ["value.isTap"]: false,
          ["value.isPlay"]: false,
          ["value.isHide"]: false
        })
      })
      resolve();
    }).then(function () {
      thispage.setData({
        UsersRecords: thispage.data.UsersRecords
      })
    })

  },

  playVoice: function (e) {
    var index = e.currentTarget.dataset.index;
    //console.log("index:"+index);
    this.data.UsersRecords[index].isPlay = true;
    innerAudioContext.play();
    this.setData({
      UsersRecords: this.data.UsersRecords,
      temIndex: index
    })
  },
  pauseVoice: function (e) {
    var index = e.currentTarget.dataset.index;
    innerAudioContext.pause();
    this.data.UsersRecords[index].isPlay = false
    this.setData({
      UsersRecords: this.data.UsersRecords
    })
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */


  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.downDatabase();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  //音乐控制:前进后退 的事件
  moveback: function () {
    var newTime;
    var thispage = this;
    var p = new Promise(function (resolve, reject) {
      newTime = thispage.data.currentTime - 5
      if (newTime < 0) newTime = 0;
      resolve();
    }).then(function () {
      var p = new Promise(function (resolve, reject) {
        innerAudioContext.seek(newTime);
        thispage.setData({
          currentTime: newTime
        })
        resolve()
      })
      return p;
    }).then(function () {
      innerAudioContext.play();
    })
  },

  moveforward: function () {
    var thispage = this;
    var newTime;
    var p = new Promise(function (resolve, reject) {
      newTime = thispage.data.currentTime + 5
      resolve();
    }).then(function () {
      var p = new Promise(function (resolve, reject) {
        innerAudioContext.seek(newTime);
        thispage.setData({
          currentTime: newTime
        })
        resolve();
      }).then(function () {
        innerAudioContext.play();
      })
    })
  },
  //拖动进度条，改变播放进度的事件
  ChangCurrentTime: function (e) {
    var newTime;
    var thispage = this;
    var p = new Promise(function (resolve, reject) {
      newTime = e.detail.value
      resolve();
    }).then(function () {
      innerAudioContext.seek(newTime);
      thispage.setData({
        currentTime: newTime
      })
    })
  },

  //手指触摸动作开始 记录起点X坐标
  touchstart: function (e) {
    //开始触摸时 重置所有删除、分享
    this.data.UsersRecords.forEach(function (v, i) { //遍历数组，将isTouchMove为ture的，重置为false
      if (v.isTouchMove)//只操作为true的
        v.isTouchMove = false;
    })
    this.setData({   //记录触摸的点
      startX: e.changedTouches[0].clientX,
      startY: e.changedTouches[0].clientY,
      UsersRecords: this.data.UsersRecords //上面的=赋值是不行的，还要传送到渲染层
    })
  },
  onReady: function () {
    var thispage = this;
    // setInterval(function () {
    //   console.log("duration:", innerAudioContext.duration)
    // }, 1500)

    innerAudioContext.duration;


    //音乐可播放时，设置slider的max值（currentTime）
    innerAudioContext.onCanplay(() => {

      console.log("onCanplay:duration:", innerAudioContext.duration)
      thispage.setData({
        duration: innerAudioContext.duration
      })
    })
  },
  changeisTap: function (e) {
    var index = e.currentTarget.dataset.index;
    var thispage = this;
    var time = 10000;
    var p = new Promise(function (resolve, reject) {
      //停止播放
      innerAudioContext.stop();
      resolve();
    }).then(function () {
      var p = new Promise(function (resolve, reject) {
        //重设音频src
        innerAudioContext.src = thispage.data.UsersRecords[index].cloudID;
        resolve()
      })
      return p;
    }).then(function () {
      var p = new Promise(function (resolve, reject) {
        innerAudioContext.seek(time)
        resolve()
      })
      return p;
    })


    //清空临时变量的值
    thispage.setData({
      currentTime: 0,
      temIndex: index
    })

    this.data.UsersRecords.forEach(function (v, i) { //遍历数组，将所有isTouchMove置为false（即侧边都收起来）
      v.isTouchMove = false;
    })
    this.data.UsersRecords.forEach(function (v, i) { //将其它的isTap置false,当前的isTap置反
      if (i != index) {
        v.isTap = false;
        v.isPlay = false;
      }
      else {
        v.isTap = !v.isTap;

        if (v.isTap == false) //如果是要收起来，那么播放按钮的状态也要还原
          v.isPlay = false;
      }
    })
    this.setData({
      UsersRecords: this.data.UsersRecords
    })
  },

  //滑动事件处理
  touchmove: function (e) {
    var that = this,
      index = e.currentTarget.dataset.index,//当前索引
      startX = that.data.startX,//开始X坐标
      startY = that.data.startY,//开始Y坐标
      touchMoveX = e.changedTouches[0].clientX,//滑动变化坐标
      touchMoveY = e.changedTouches[0].clientY,//滑动变化坐标
      //计算滑动角度
      angle = that.angle({ X: startX, Y: startY }, { X: touchMoveX, Y: touchMoveY });
    that.data.UsersRecords.forEach(function (v, i) {
      v.isTouchMove = false

      //滑动超过30度角 return
      if (Math.abs(angle) > 30) return;
      if (i == index) {
        if (touchMoveX > startX) //右滑
          v.isTouchMove = false
        else //左滑
          v.isTouchMove = true
      }
    })
    //更新数据
    that.setData({
      UsersRecords: that.data.UsersRecords
    })
  },
  /**
   * 计算滑动角度
   * @param {Object} start 起点坐标
   * @param {Object} end 终点坐标
   */
  angle: function (start, end) {
    var _X = end.X - start.X,
      _Y = end.Y - start.Y
    //返回角度 /Math.atan()返回数字的反正切值
    return 360 * Math.atan(_Y / _X) / (2 * Math.PI);
  },

  //删除云端的记录及存储的文件
  deletFile: function (e) {
      wx.showToast({
        title: '删除中',
        icon: 'loading',
        duration: 2000
      });

    var thispage = this;
    var index = e.currentTarget.dataset.index;
    var deletFile_name = this.data.UsersRecords[index].name;
    var deletFile_couldID = this.data.UsersRecords[index].cloudID;
    db.collection('UsersRecords').doc(this.data.UsersRecords[index]._id).remove({
      success: function () {
        console.log("删除了 " + deletFile_name + " 的记录.")
        wx.cloud.deleteFile({
          fileList: [deletFile_couldID],
          success: res => {
            // handle success
            console.log("成功删除了文件", res)
            thispage.downDatabase();
          },
          fail: err => {
            console.log("删除文件失败", err)
          }
        })
      },
      fail: function () {
        console.error("删除记录失败.")
      }
    })
  },


  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function (res) {
    var thispage = this;
    var index = res.target.dataset.index;
    if (res.from === 'button') {
      // 如果来源是页面内的转发按钮
      //console.log(res)
    }
    return {
      title: '分享文件 ',
      path: "/pages/records/recors?formshare='{{true}}'&cloudID_shared='{{thispage.data.UsersRecords[index].coudID}}'"
    }
  }
})