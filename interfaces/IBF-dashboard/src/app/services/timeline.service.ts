import { Injectable } from '@angular/core';
import * as moment from 'moment';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { CountryService } from 'src/app/services/country.service';
import { LeadTime, LeadTimeTriggerKey } from 'src/app/types/lead-time';
import { MockScenarioService } from '../mocks/mock-scenario-service/mock-scenario.service';
import { MockScenario } from '../mocks/mock-scenario.enum';

@Injectable({
  providedIn: 'root',
})
export class TimelineService {
  public activeLeadTime: LeadTime;
  public state = {
    today: moment(),
    timeStepButtons: [],
  };
  private triggers: any[];
  private timelineSubject = new BehaviorSubject<LeadTime>(null);

  constructor(
    private countryService: CountryService,
    private apiService: ApiService,
    private mockScenarioService: MockScenarioService,
  ) {
    this.mockScenarioService
      .getMockScenarioSubscription()
      .subscribe((mockScenario: MockScenario) => {
        this.loadTimeStepButtons();
      });
  }

  getTimelineSubscription(): Observable<LeadTime> {
    return this.timelineSubject.asObservable();
  }

  public async loadTimeStepButtons() {
    const activeCountry = this.countryService.getActiveCountry();
    const dates = await this.apiService.getRecentDates(
      activeCountry.countryCodeISO3,
    );
    this.state.today = moment(dates[0].value);

    this.triggers = await this.getTrigger();

    this.state.timeStepButtons = await Promise.all(
      [
        LeadTime.day1,
        LeadTime.day2,
        LeadTime.day3,
        LeadTime.day4,
        LeadTime.day5,
        LeadTime.day6,
        LeadTime.day7,
      ].map(
        async (leadTime: LeadTime): Promise<object> => {
          const triggerKey: string = LeadTimeTriggerKey[leadTime];
          const x = {
            date: this.state.today.clone().add(triggerKey, 'days'),
            value: leadTime,
            alert: this.triggers[triggerKey] == 1,
            disabled: await this.isLeadTimeDisabled(leadTime),
            active: false,
          };
          return x;
        },
      ),
    );

    const enabledTimeStepButtons = this.state.timeStepButtons.filter(
      (timeStepButton) => !timeStepButton.disabled,
    );
    if (enabledTimeStepButtons.length > 0) {
      this.handleTimeStepButtonClick(enabledTimeStepButtons[0].value);
    }
  }

  public handleTimeStepButtonClick(timeStepButtonValue) {
    this.activeLeadTime = timeStepButtonValue;
    this.state.timeStepButtons.forEach((i) => (i.active = false));
    this.state.timeStepButtons.find(
      (i) => i.value === timeStepButtonValue,
    ).active = true;
    this.timelineSubject.next(this.activeLeadTime);
  }

  private async isLeadTimeDisabled(leadTime: LeadTime): Promise<boolean> {
    const activeCountry = this.countryService.getActiveCountry();
    const leadTimes = [...activeCountry.countryLeadTimes].sort();
    const index = leadTimes.indexOf(leadTime);
    const leadTimeNotAvailable = index < 0;
    const lowerLeadTimeNotTriggered =
      this.triggers[LeadTimeTriggerKey[leadTime]] == 0;

    return leadTimeNotAvailable || lowerLeadTimeNotTriggered;
  }

  public async getTrigger(): Promise<any> {
    const activeCountry = this.countryService.getActiveCountry();
    const trigger = await this.apiService.getTriggerPerLeadTime(
      activeCountry.countryCodeISO3,
    );
    return trigger;
  }

  public async getEvent(): Promise<any> {
    const activeCountry = this.countryService.getActiveCountry();
    const event = await this.apiService.getEvent(activeCountry.countryCodeISO3);
    return event;
  }
}