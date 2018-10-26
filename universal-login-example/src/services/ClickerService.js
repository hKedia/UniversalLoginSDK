import ethers, {Interface} from 'ethers';
import Clicker from '../../build/Clicker';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';

class ClickerService {
  constructor(identityService, clickerContractAddress, provider, ensService, tokenContractAddress, defaultPaymentOptions) {
    this.identityService = identityService;
    this.clickerContractAddress = clickerContractAddress;
    this.provider = provider;
    this.tokenContractAddress = tokenContractAddress;
    this.defaultPaymentOptions = defaultPaymentOptions;
    this.clickerContract = new ethers.Contract(
      this.clickerContractAddress,
      Clicker.interface,
      this.provider
    );
    this.event = new Interface(Clicker.interface).events.ButtonPress;
    this.ensService = ensService;
  }

  async click() {
    const message = {
      to: this.clickerContractAddress,
      from: this.identityService.identity.address,
      value: 0,
      data: this.clickerContract.interface.functions.press().data,
      gasToken: this.tokenContractAddress,
      ...this.defaultPaymentOptions
    };
    await this.identityService.execute(message);
  }

  async getLastClick() {
    return await this.clickerContract.lastPressed();
  }

  getTimeDistanceInWords(time) {
    const date = new Date(time * 1000);
    return distanceInWordsToNow(date, {includeSeconds: true});
  }

  async getEnsName(address) {
    return await this.ensService.getEnsName(address);
  }

  async getEventsFromLogs(events) {
    const pressers = [];
    for (const event of events) {
      const eventArguments = this.event.parse(this.event.topics, event.data);
      pressers.push({
        address: eventArguments.presser,
        name: await this.getEnsName(eventArguments.presser),
        pressTime: this.getTimeDistanceInWords(
          parseInt(eventArguments.pressTime, 10)
        ),
        score: parseInt(eventArguments.score, 10),
        key: event.data
      });
    }
    return pressers.reverse();
  }

  async getPressEvents() {
    const filter = {
      fromBlock: 0,
      address: this.clickerContractAddress,
      topics: [this.event.topics]
    };
    const events = await this.provider.getLogs(filter);
    return this.getEventsFromLogs(events);
  }
}

export default ClickerService;
