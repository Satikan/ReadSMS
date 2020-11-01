import React, {Component} from 'react';
import {
  Alert,
  Platform,
  Button,
  Clipboard,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  PermissionsAndroid,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import io from 'socket.io-client';
import axios from 'axios';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

export default class App extends Component {
  constructor() {
    super();
    this.state = {
      chatMessage: '',
      sendTo: '',
      sendBody: '',
      minDate: '',
      maxDate: '',
      smsList: [],
      chatMessages: []
    };
  }

  async componentDidMount() {
    if (Platform.OS === 'android') {
      try {
        if (!(await this.checkPermissions())) {
          await this.requestPermissions();
        }

        if (await this.checkPermissions()) {
          this.listSMS();
        }

        this.socket = io('http://192.168.1.33:3000');
        console.log(this.socket)
        this.socket.on("get sms", msg => {
          console.log(msg)
          this.setState({chatMessages: [...this.state.chatMessages, msg]});
        })
      } catch (e) {
        console.error(e);
      }
    }
  }

  async checkPermissions() {
    console.log('checking SMS permissions');
    let hasPermissions = false;
    try {
      hasPermissions = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      if (!hasPermissions) return false;
      hasPermissions = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.SEND_SMS,
      );
      if (!hasPermissions) return false;
    } catch (e) {
      console.error(e);
    }
    return hasPermissions;
  }

  async requestPermissions() {
    let granted = {};
    try {
      console.log('requesting SMS permissions');
      granted = await PermissionsAndroid.requestMultiple(
        [
          PermissionsAndroid.PERMISSIONS.READ_SMS,
          PermissionsAndroid.PERMISSIONS.SEND_SMS,
        ],
        {
          title: 'Example App SMS Features',
          message: 'Example SMS App needs access to demonstrate SMS features',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      console.log(granted);
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('You can use SMS features');
      } else {
        console.log('SMS permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  }

  sendSMS = () => {
    SmsAndroid.autoSend(
      this.state.sendTo,
      this.state.sendBody,
      (err) => {
        Alert.alert('Failed to send SMS. Check console');
        console.log('SMS SEND ERROR', err);
      },
      (success) => {
        Alert.alert('SMS sent successfully');
      },
    );
  };

  submitChatMessage() {
    this.socket.emit("get sms", this.state.chatMessage);
    this.setState({chatMessage: ""});
  }

  renderSendSMS = () => {
    return (
      <View style={{flex: 1, alignItems: 'flex-start'}}>
        <Text style={styles.welcome}>Send SMS</Text>
        <Text>To</Text>
        <TextInput
          style={{
            width: '100%',
            borderRadius: 20,
            height: 40,
            borderColor: 'gray',
            borderWidth: 1,
          }}
          onChangeText={(text) => this.setState({sendTo: text})}
          value={this.state.sendTo}
          keyboardType={'numeric'}
        />
        <Text>Message</Text>
        <TextInput
          style={{
            borderRadius: 20,
            height: 40,
            borderColor: 'gray',
            borderWidth: 1,
          }}
          onChangeText={(text) => this.setState({sendBody: text})}
          value={this.state.sendBody}
        />
        <Button title="send sms" onPress={() => this.sendSMS()} />
      </View>
    );
  };

  listSMS = () => {
    const {minDate, maxDate} = this.state;
    var filter = {
      box: 'inbox',
      address: '+66862765988',
      // maxCount: 30,
    };
    // if (minDate !== "") {
    //   filter.minDate = minDate
    // }
    // if (maxDate !== "") {
    //   filter.maxDate = maxDate
    // }

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.log('Failed with this error: ' + fail);
      },
      (count, smsList) => {
        var arr = JSON.parse(smsList);
        console.log(arr);
        this.setState({smsList: arr});
      },
    );
  };

  pasteDateFilter = (str) => {
    switch (str) {
      case 'minDate':
      case 'maxDate':
        return async () => {
          const content = await Clipboard.getString();
          this.setState({[str]: content});
        };
        break;
      default:
    }
  };

  renderDateFilter = (str) => {
    switch (str) {
      case 'minDate':
      case 'maxDate':
        return (
          <View>
            <Text>{str} (UNIX timestamp in ms)</Text>
            <View style={{flexDirection: 'row'}}>
              <TextInput
                style={{
                  flex: 1,
                  borderRadius: 20,
                  height: 40,
                  borderColor: 'gray',
                  borderWidth: 1,
                }}
                onChangeText={(text) => this.setState({[str]: text})}
                value={this.state[str]}
                keyboardType={'numeric'}
              />
              <Button title="paste" onPress={this.pasteDateFilter(str)} />
            </View>
          </View>
        );
        break;
      default:
    }
  };

  renderFilters = () => {
    return (
      <View>
        {this.renderDateFilter('minDate')}
        {this.renderDateFilter('maxDate')}
      </View>
    );
  };

  getPayload() {
    console.log("Get payload")
    axios.get('https://jsonplaceholder.typicode.com/todos').then(res => {
      console.log(res)
    }).catch(error => {
      // console.log(error)
      console.log(error)
    })
  }

  renderShowSMS() {
    return this.state.smsList.map((sms) => {
      return (
        <View style={{borderColor: '#bbb', borderWidth: 1}} key={sms._id}>
          <Text>From: {sms.address}</Text>
          <Text>Body: {sms.body}</Text>
          <Text>Id: {sms._id}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text>Date timestamp: {sms.date}</Text>
            <Button
              title="copy date"
              onPress={() => Clipboard.setString(sms.date.toString())}
            />
          </View>
          <Text>Date (readable): {new Date(sms.date).toString()}</Text>
        </View>
      );
    });
  }

  renderLatestMessages = () => {
    return (
      <View style={{flex: 2, alignItems: 'flex-start'}}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {/* <Text style={styles.welcome}>Latest Messages</Text> */}
          <Button title="Read SMS" onPress={this.listSMS} />
          <Button title="Get Payload" onPress={this.getPayload} />
        </View>
        {/* {this.renderFilters()} */}
        <ScrollView>{this.renderShowSMS()}</ScrollView>
      </View>
    );
  };

  render() {
  const chatMessages = this.state.chatMessages.map(chatMessage => <Text key={chatMessage}>{chatMessage}</Text>)
    // The default 'react-native init' output is used if not android platform
    if (Platform.OS !== 'android') {
      return (
        <View style={styles.container}>
          <Text style={styles.welcome}>Welcome to React Native!</Text>
          <Text style={styles.instructions}>To get started, edit App.js</Text>
          <Text style={styles.instructions}>{instructions}</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* {this.renderSendSMS()} */}
        {this.renderLatestMessages()}
        <TextInput
          style={{height: 40, width: 300, borderWidth: 2}}
          autoCorrect={false}
          value={this.state.chatMessage}
          onSubmitEditing={() => this.submitChatMessage()}
          onChangeText={(chatMessage) => {
            this.setState({chatMessage});
          }}
        />
        {chatMessages}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    backgroundColor: '#F5FCFF',
  },
});
