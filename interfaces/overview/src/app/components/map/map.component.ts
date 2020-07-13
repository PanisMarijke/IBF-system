import { Component, OnInit } from '@angular/core';
import { LeafletControlLayersConfig } from '@asymmetrik/ngx-leaflet';
import {
  geoJSON,
  icon,
  IconOptions,
  latLng,
  LatLng,
  Map,
  MapOptions,
  marker,
  tileLayer,
} from 'leaflet';
import { Station } from 'src/app/models/station.model';
import { MapService } from 'src/app/services/map.service';
import { IbfLayer } from 'src/app/types/ibf-layer';
import { IbfLayerName } from 'src/app/types/ibf-layer-name';
import { IbfLayerType } from 'src/app/types/ibf-layer-type';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
  private map: Map;
  public layers: IbfLayer[];

  // Define our base layers so we can reference them multiple times
  private hotTileLayer = tileLayer(
    'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a> hosted by <a href="https://openstreetmap.fr/" target="_blank">OpenStreetMap France</a>',
    },
  );

  private osmTileLayer = tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  );

  private iconDefault: IconOptions = {
    iconSize: [25, 41],
    iconAnchor: [13, 41],
    iconUrl: 'assets/markers/default.png',
    iconRetinaUrl: 'assets/markers/default-2x.png',
  };
  private iconWarning: IconOptions = {
    ...this.iconDefault,
    iconUrl: 'assets/markers/warning.png',
    iconRetinaUrl: 'assets/markers/warning-2x.png',
  };

  public leafletOptions: MapOptions = {
    zoom: 5,
    layers: [this.hotTileLayer],
  };

  public leafletLayersControl: LeafletControlLayersConfig = {
    baseLayers: {
      'OpenStreetMap default': this.osmTileLayer,
      'Humanitairian OpenStreetMap': this.hotTileLayer,
    },
    overlays: {},
  };

  constructor(public mapService: MapService) {
    this.leafletOptions.center = latLng(this.mapService.state.center);
  }

  ngOnInit() {}

  async onMapReady(map: Map) {
    this.map = map;

    // Trigger a resize to fill the container-element:
    window.dispatchEvent(new UIEvent('resize'));

    await this.mapService.loadData();
    this.mapService.state.layers = this.createLayers(
      this.mapService.state.layers,
    );
    this.addToLayersControl();
  }

  private createLayers(layers: IbfLayer[]) {
    return layers.map((layer) => {
      if (!layer.active) {
        return;
      }

      if (layer.type === IbfLayerType.point) {
        layer.leafletLayer = this.createPointLayer(layer);
      }

      return layer;
    });
  }

  private addToLayersControl(): void {
    this.mapService.state.layers.forEach((layer) => {
      this.leafletLayersControl.overlays[layer.name] = layer.leafletLayer;
    });
  }

  private createPointLayer(layer: IbfLayer) {
    if (!layer.data) {
      return;
    }
    return geoJSON(layer.data, {
      pointToLayer: (geoJsonPoint: GeoJSON.Feature, latlng: LatLng) => {
        switch (layer.name) {
          case IbfLayerName.waterStations:
            return this.createMarkerStation(
              geoJsonPoint.properties as Station,
              latlng,
            );
          default:
            return this.createMarkerDefault(latlng);
        }
      },
    });
  }

  private createMarkerDefault(markerLatLng: LatLng) {
    return marker(markerLatLng, {
      icon: icon(this.iconDefault),
    });
  }

  private createMarkerStation(markerProperties: Station, markerLatLng: LatLng) {
    const markerTitle = markerProperties.stationName;
    let markerIcon = this.iconDefault;

    if (markerProperties.forecastLevel > markerProperties.triggerLevel) {
      markerIcon = this.iconWarning;
    }

    return marker(markerLatLng, {
      title: markerTitle,
      icon: icon(markerIcon),
    });
  }
}
