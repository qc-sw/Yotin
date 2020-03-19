// pages/records/records.js
const recorderManager = wx.getRecorderManager()
const app = getApp();
const db = wx.cloud.database();
const innerAudioContext = wx.createInnerAudioContext()

const options = {
  duration: 600000,
  sampleRate: 16000,
  numberOfChannels: 1,
  encodeBitRate: 48000,
  format: 'mp3', //这里是生成的音频文件格式
  frameSize: 50,
}


Page({

  /**
   * 页面的初始数据
   */
  data: {
    tempFilePath: null,
    UsersRecords:[],
    temRecordid:null,
    temcouldID:null

  },
  downloadFile:function(){
    wx.cloud.downloadFile({
      fileID: this.data.temcouldID,
      success:res=>{
        console.log(res.tempFilePath)
        innerAudioContext.src = res.tempFilePath;
        res.tempFilePath.play();
      }
    })

  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options){
    var thispage = this;

    

    innerAudioContext.autoplay = true;
    innerAudioContext.onPlay(()=>{
      console.log("start")
    })

    //先拉取数据
    thispage.downDatabase();
    innerAudioContext.onPlay(()=>{
      console.log("录音播放\n"+"innerAudioContext.src:", innerAudioContext.src)
    })
    
    //录音结束监听函数
    recorderManager.onStop((res)=>{
      console.log("录音结束",res)

      //获得临时文件路径
      thispage.setData({
        tempFilePath: res.tempFilePath
      })

    })
  },

  downDatabase:function(){
    var thispage = this;
    db.collection("UsersRecords").get({
      success:function(res){
        console.log("申请数据",res)
        thispage.setData({
          UsersRecords:res.data
        })
      }
    })
  },
  uploadFile: function () {
    let thispage = this;

    //先创建一条数据库记录
    db.collection("UsersRecords").add({
      data: {
        name: "未命名",
        cloudID: null,
        CreatTime: db.serverDate(),
      },
      success: function (res) {
        console.log("记录创建成功", res)

        //获得记录的_id
        thispage.setData({
          temRecordid: res._id
        })

        //console.log("thispage.data.temRecordid:", thispage.data.temRecordid)

        //上传文件（根据_id给它命名）
        wx.cloud.uploadFile({
          cloudPath: app.globalData.openid +'/'+thispage.data.temRecordid + thispage.data.tempFilePath.match(/\.[^.]+?$/)[0],
          filePath: thispage.data.tempFilePath,
          success: function (res) {
            console.log("上传成功", res);
            thispage.setData({
              temcouldID: res.fileID
            });

            //然后再修改对应记录的couldID
            db.collection("UsersRecords").doc(thispage.data.temRecordid).update({
              data: {
                cloudID: thispage.data.temcouldID
              },
              success: function (res) {
                console.log("成功修改了couldid",res);

                //重新拉取数据
                thispage.downDatabase();
              },
              fail: function () {
                console.log("修改couldid失败！")
              }
            })
          }
        })

      }
    }) 
  },
  playclouldFlie(e) {
    var index = e.currentTarget.dataset.index;
    innerAudioContext.src = this.data.UsersRecords[index].cloudID;
    console.log("this.data.UsersRecords[index].cloudID:", this.data.UsersRecords[index].cloudID)
    console.log("innerAudioContext.src:", innerAudioContext.src)
    console.log("播放录音")
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

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
  startRecord:function(){
    recorderManager.start(options)
      console.log('recorder start')
  },
  
  stopRecord:function(){
    recorderManager.stop()
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})