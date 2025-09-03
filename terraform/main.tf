terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "2.66.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.8.4"
    }
    local = {
      source  = "hashicorp/local"
      version = "2.5.3"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.7.2"
    }
  }

  required_version = "~> 1.13.0"

  backend "s3" {
    endpoints = {
      s3 = "https://sgp1.digitaloceanspaces.com"
    }
    key                         = "terraform.tfstate"
    bucket                      = "do-carii-tfstate-bookcars"
    region                      = "us-east-1"
    skip_requesting_account_id  = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
  }
}

variable "do_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "do_spaces_access_id" {
  type      = string
  sensitive = true
}

variable "do_spaces_secret_key" {
  type      = string
  sensitive = true
}

provider "digitalocean" {
  token = var.do_token

  spaces_access_id  = var.do_spaces_access_id
  spaces_secret_key = var.do_spaces_secret_key
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

locals {
  do_project_name = "infrastructure-${terraform.workspace}"
}

data "digitalocean_project" "this" {
  name = local.do_project_name
}
